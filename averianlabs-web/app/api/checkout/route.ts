import crypto from "node:crypto"
import { orders } from "@/db/schema"
import { checkoutSchema } from "@/lib/checkout/schema"
import { getCurrentMember } from "@/lib/community"
import { db } from "@/lib/db"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { createOrder, OrderError, releaseExpiredReservations } from "@/lib/orders"
import { orderAccessToken } from "@/lib/orders/access"
import { stripe } from "@/lib/payments/stripe"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { getCachedShippingRates } from "@/lib/shipping/cached"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ code: "invalid_input", error: "Invalid checkout payload." }, { status: 400 })
  if (!(await rateLimit(`checkout:${clientIp(request)}`, { limit: 30, window: "1 h" })).success) return NextResponse.json({ code: "rate_limited" }, { status: 429 })
  const input = parsed.data
  const env = getServerEnv()
  // Hosted cryptocurrency creation is not enabled until provider retry semantics are verified.
  if (input.paymentMethod !== "stripe" || !env.STRIPE_SECRET_KEY) return NextResponse.json({ code: "payment_unavailable" }, { status: 503 })
  try {
    await releaseExpiredReservations()
    const member = await getCurrentMember().catch(() => null)
    const rates = await getCachedShippingRates(input.shippingAddress)
    const rate = rates.find((rate) => rate.id === input.shippingMethodId)
    if (!rate) return NextResponse.json({ code: "unknown_shipping" }, { status: 400 })
    const checkoutHash = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex")
    const order = await createOrder({ ...input, checkoutKey: input.requestKey, checkoutHash, shippingCents: rate.priceCents, userId: member?.id, termsAccepted: true })
    const origin = env.AUTH_URL ?? new URL(request.url).origin
    const confirmationUrl = `${origin}/${input.locale}/checkout/confirm/${order.id}?token=${orderAccessToken(order.id)}`
    if (["paid", "shipped", "delivered"].includes(order.status)) return NextResponse.json({ orderId: order.id, confirmationUrl, status: order.status })
    const intent = await stripe().paymentIntents.create({ amount: order.totalCents, currency: "eur", metadata: { orderId: order.id, orderNumber: order.number }, receipt_email: order.email, payment_method_types: ["card"] }, { idempotencyKey: order.id })
    if (order.stripePaymentIntentId && order.stripePaymentIntentId !== intent.id) throw new OrderError("Payment reference mismatch", "payment_mismatch")
    await db.update(orders).set({ stripePaymentIntentId: intent.id }).where(eq(orders.id, order.id))
    return NextResponse.json({ orderId: order.id, orderNumber: order.number, confirmationUrl, clientSecret: intent.client_secret, totalCents: order.totalCents })
  } catch (error) {
    // Ambiguous provider failures retain the pending attempt. Its stable provider key allows retry;
    // the reservation TTL provides recovery without racing an already-created payment intent.
    if (error instanceof OrderError) return NextResponse.json({ code: error.code }, { status: 409 })
    logger.error("[checkout] unavailable", error)
    return NextResponse.json({ code: "checkout_unavailable" }, { status: 503 })
  }
}
