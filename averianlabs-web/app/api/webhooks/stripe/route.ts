import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import {
  forgetWebhookEvent,
  getOrderById,
  getOrderSkuQuantities,
  markOrderFailed,
  markOrderPaid,
  markOrderRefunded,
  recordWebhookEvent,
  restoreStock,
  sendOrderConfirmationEmail,
} from "@/lib/orders"
import { stripe } from "@/lib/payments/stripe"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"

export async function POST(req: NextRequest) {
  // Per-IP rate guard — Stripe retries are deterministic and short (a few
  // minutes at most), so anything north of 1000/min from one IP is an
  // abuse signal and we refuse to keep checking signatures.
  const ip = clientIp(req)
  const limit = await rateLimit(`webhook:stripe:${ip}`, { limit: 1000, window: "1 m" })
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const sig = req.headers.get("stripe-signature")
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 })

  const secret = getServerEnv().STRIPE_WEBHOOK_SECRET
  if (!secret) {
    logger.error("[stripe] STRIPE_WEBHOOK_SECRET is not configured")
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 })
  }

  const buf = await req.text()
  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(buf, sig, secret)
  } catch (err) {
    logger.error("[stripe] signature verification failed", err)
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  // At-least-once delivery: process each event id exactly once.
  if (!(await recordWebhookEvent("stripe", event.id))) {
    return NextResponse.json({ received: true })
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.orderId
        if (!orderId) break

        const order = await getOrderById(orderId)
        if (!order) {
          logger.error("[stripe] order not found for payment intent", pi.id, orderId)
          break
        }

        if (
          pi.amount !== order.totalCents ||
          (pi.currency ?? "").toLowerCase() !== order.currency.toLowerCase()
        ) {
          logger.error("[stripe] payment amount mismatch", {
            orderId,
            expectedCents: order.totalCents,
            receivedCents: pi.amount,
            currency: pi.currency,
          })
          break
        }

        // Stock was reserved at order creation — only flag + notify here.
        if (await markOrderPaid(orderId, pi.id, "stripe")) {
          await sendOrderConfirmationEmail(orderId)
        }
        break
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.orderId
        if (orderId) await markOrderFailed(orderId)
        break
      }
      case "payment_intent.canceled": {
        // Final failure: release the reserved stock exactly once.
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.orderId
        if (orderId && (await markOrderFailed(orderId))) {
          await restoreStock(await getOrderSkuQuantities(orderId))
        }
        break
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        const piId = charge.payment_intent as string
        if (piId) {
          const pi = await stripe().paymentIntents.retrieve(piId)
          const orderId = pi.metadata?.orderId
          if (orderId) await markOrderRefunded(orderId)
        }
        break
      }
    }
  } catch (err) {
    // Allow the provider to retry this event on the next delivery.
    await forgetWebhookEvent("stripe", event.id).catch(() => {})
    logger.error("[stripe] handler failed", err)
    return NextResponse.json({ error: "processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
