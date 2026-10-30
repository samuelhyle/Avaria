import crypto from "node:crypto"
import { cryptoCheckoutSessions } from "@/db/schema"
import { checkoutSchema } from "@/lib/checkout/schema"
import { getCurrentMember } from "@/lib/community"
import { type ChainId, isChainId } from "@/lib/crypto/chains"
import { enabledChains } from "@/lib/crypto/rates"
import { CryptoSessionError, createCryptoSession, telegramDeepLink } from "@/lib/crypto/session"
import { db } from "@/lib/db"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { OrderError, createOrder, releaseExpiredReservations } from "@/lib/orders"
import { orderAccessToken } from "@/lib/orders/access"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { getCheckoutShippingRates } from "@/lib/shipping/cached"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const Body = checkoutSchema.extend({
  chain: z.string().min(1).max(32),
})

/**
 * Issue a crypto invoice.
 *
 * The order is created on the server first — with its lines, its batch
 * assignment and its inventory hold — and only then is the Telegram invoice
 * generated. The browser is handed a `t.me` deep link and nothing else: the
 * cart never travels in the URL, and the bot reads the order from the server
 * rather than trusting anything the client sends.
 */
export async function POST(request: Request) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  const body = await request.json().catch(() => null)
  const parsed = Body.safeParse(body)
  if (!parsed.success) return NextResponse.json({ code: "invalid_input" }, { status: 400 })
  if (
    !(await rateLimit(`checkout-crypto:${clientIp(request)}`, { limit: 10, window: "1 h" })).success
  )
    return NextResponse.json({ code: "rate_limited" }, { status: 429 })

  const env = getServerEnv()
  const chain = parsed.data.chain.toLowerCase()
  if (!isChainId(chain)) return NextResponse.json({ code: "unknown_chain" }, { status: 400 })
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_BOT_USERNAME)
    return NextResponse.json({ code: "payment_unavailable" }, { status: 503 })
  const chains = enabledChains()
  if (!chains.length || !chains.includes(chain))
    return NextResponse.json({ code: "chain_disabled" }, { status: 400 })

  const input = parsed.data
  try {
    await releaseExpiredReservations()
    const member = await getCurrentMember().catch(() => null)
    const rates = await getCheckoutShippingRates(input.shippingAddress, input.items)
    const rate = rates.find((rate) => rate.id === input.shippingMethodId)
    if (!rate) return NextResponse.json({ code: "unknown_shipping" }, { status: 400 })

    const checkoutHash = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex")
    const order = await createOrder({
      ...input,
      paymentMethod: "crypto",
      checkoutKey: input.requestKey,
      checkoutHash,
      shippingCents: rate.priceCents,
      userId: member?.id,
      termsAccepted: true,
    })
    // A repeated attempt with the same key returns the order that already
    // exists. Re-issue the invoice for it rather than creating a second one.
    const existing = await db
      .select()
      .from(cryptoCheckoutSessions)
      .where(eq(cryptoCheckoutSessions.orderId, order.id))
      .limit(1)
    const session =
      existing[0] ??
      (await createCryptoSession({
        orderId: order.id,
        chain: chain as ChainId,
        totalCents: order.totalCents,
      }))
    const telegramUrl = telegramDeepLink(session.id)
    const origin = env.AUTH_URL ?? new URL(request.url).origin
    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.number,
      telegramUrl,
      amountCrypto: session.amountCrypto,
      chain,
      expiresAt: session.expiresAt,
      confirmationUrl: `${origin}/${input.locale}/checkout/confirm/${order.id}?token=${orderAccessToken(
        order.id,
      )}`,
    })
  } catch (error) {
    if (error instanceof CryptoSessionError)
      return NextResponse.json({ code: error.code }, { status: 400 })
    if (error instanceof OrderError) return NextResponse.json({ code: error.code }, { status: 409 })
    logger.error("[checkout-crypto] unavailable", error)
    return NextResponse.json({ code: "checkout_unavailable" }, { status: 503 })
  }
}
