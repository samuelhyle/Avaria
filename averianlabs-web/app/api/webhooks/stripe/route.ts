import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import {
  OrderError,
  getOrderById,
  hasProcessedWebhookEvent,
  markOrderFailed,
  markOrderPaid,
  markOrderRefunded,
  recordWebhookEvent,
} from "@/lib/orders"
import { stripe } from "@/lib/payments/stripe"
import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature")
  if (!signature) return NextResponse.json({ code: "no_signature" }, { status: 400 })
  const secret = getServerEnv().STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ code: "webhook_unavailable" }, { status: 503 })
  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret)
  } catch {
    return NextResponse.json({ code: "invalid_signature" }, { status: 400 })
  }
  try {
    if (await hasProcessedWebhookEvent("stripe", event.id))
      return NextResponse.json({ received: true })
    if (["payment_intent.succeeded", "payment_intent.canceled"].includes(event.type)) {
      const intent = event.data.object as Stripe.PaymentIntent
      const id = intent.metadata?.orderId
      if (!id) throw new OrderError("Missing order metadata")
      const order = await getOrderById(id)
      if (
        !order ||
        order.paymentMethod !== "stripe" ||
        (order.stripePaymentIntentId && order.stripePaymentIntentId !== intent.id) ||
        intent.amount !== order.totalCents ||
        intent.currency.toUpperCase() !== order.currency
      )
        throw new OrderError("Payment mismatch", "payment_mismatch")
      if (event.type === "payment_intent.succeeded") await markOrderPaid(id, intent.id)
      else await markOrderFailed(id)
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge
      if (
        charge.refunded &&
        charge.amount_refunded === charge.amount &&
        typeof charge.payment_intent === "string"
      ) {
        const intent = await stripe().paymentIntents.retrieve(charge.payment_intent)
        const order = intent.metadata.orderId ? await getOrderById(intent.metadata.orderId) : null
        if (
          !order ||
          order.stripePaymentIntentId !== intent.id ||
          charge.currency.toUpperCase() !== order.currency ||
          charge.amount !== order.totalCents
        )
          throw new OrderError("Refund mismatch", "payment_mismatch")
        await markOrderRefunded(order.id)
      }
    }
    // Declines can be retried on the same intent. Only cancellation/expiry release stock.
    // The ledger is written after durable side effects; a crash can safely replay the transition.
    await recordWebhookEvent("stripe", event.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error("[stripe] webhook processing failed", error)
    return NextResponse.json({ code: "processing_failed" }, { status: 500 })
  }
}
