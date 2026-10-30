import { quoteSchema } from "@/lib/checkout/schema"
import { db } from "@/lib/db"
import { releaseExpiredReservations } from "@/lib/orders"
import { OrderError, quoteCart, toPublicPromotion } from "@/lib/orders/quote"
import { computeShippingCents } from "@/lib/pricing"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { getCheckoutShippingRates } from "@/lib/shipping/cached"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  const parsed = quoteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "invalid_input" }, { status: 400 })
  if (
    !(await rateLimit(`checkout-quote:${clientIp(request)}`, { limit: 120, window: "1 h" })).success
  )
    return NextResponse.json({ code: "rate_limited" }, { status: 429 })
  try {
    await releaseExpiredReservations()
    const input = parsed.data
    const rates = await getCheckoutShippingRates(input, input.items)
    const rate = input.shippingMethodId
      ? rates.find((rate) => rate.id === input.shippingMethodId)
      : rates[0]
    if (!rate) return NextResponse.json({ code: "unknown_shipping" }, { status: 400 })
    const quote = await quoteCart(
      input.items,
      rate.priceCents,
      input.locale,
      db,
      false,
      input.promoCode,
    )
    return NextResponse.json({
      // Only the public promotion fields leave the server.
      quote: { ...quote, promotion: toPublicPromotion(quote.promotion) },
      shippingMethodId: rate.id,
      rates: rates.map((rate) => ({
        ...rate,
        priceCents: computeShippingCents(quote.subtotalCents, rate.priceCents),
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { code: error instanceof OrderError ? error.code : "quote_unavailable" },
      { status: error instanceof OrderError ? 409 : 503 },
    )
  }
}
