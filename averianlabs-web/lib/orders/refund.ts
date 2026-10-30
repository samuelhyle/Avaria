import { orders } from "@/db/schema"
import { db } from "@/lib/db"
import { escapeHtml } from "@/lib/email/html"
import { enqueueEmail } from "@/lib/email/outbox"
import { logger } from "@/lib/logger"
import { stripe } from "@/lib/payments/stripe"
import { eq } from "drizzle-orm"
import { markOrderRefunded } from "./service"

/**
 * Refunds.
 *
 * The admin console used to flip an order to `refunded` and nothing else: no
 * money moved, no stock came back and the customer was never told. An operator
 * who pressed the button believed the customer had been paid back.
 *
 * A refund now has to name how the money went back:
 *
 *   `stripe`  — taken through the payment provider.
 *   `crypto`  — sent as an outbound transfer. A crypto payment cannot be
 *               reversed by the platform, so the operator supplies the outbound
 *               transaction hash. A refund without one is refused.
 *   `manual`  — settled outside the application. The operator supplies a
 *               reason, which is recorded, because the alternative is a silent
 *               success that nobody can audit later.
 */

export type RefundMethod = "stripe" | "crypto" | "manual"

/**
 * The payment provider's refund call.
 *
 * Injectable so the refund path can be tested without a provider account.
 * Defaults to Stripe.
 */
export interface RefundProvider {
  refund(params: { payment_intent: string }): Promise<{ id: string }>
}

export interface RefundInput {
  orderId: string
  method: RefundMethod
  /** Required for `crypto`: the outbound transaction hash. */
  cryptoTxHash?: string
  /** Required for `manual`: why the money was returned outside the application. */
  reason?: string
  actorId: string
  /** Overrides the payment provider. For tests. */
  provider?: RefundProvider
}

export class RefundError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_found"
      | "not_refundable"
      | "payment_not_configured"
      | "missing_reference"
      | "missing_reason"
      | "provider_failed",
  ) {
    super(message)
    this.name = "RefundError"
  }
}

export interface RefundResult {
  orderId: string
  method: RefundMethod
  /** The provider's refund id, the outbound transaction hash, or the reason. */
  reference: string
  /** True when the order was already refunded and nothing was charged again. */
  alreadyRefunded: boolean
}

const REFUNDABLE = ["paid", "packed", "shipped", "delivered", "payment_review"] as const

/**
 * Refund an order.
 *
 * Idempotent: refunding an order that is already refunded returns the
 * original reference and does not touch the payment provider again. A double
 * press must never pay the customer twice.
 */
export async function refundOrder(input: RefundInput): Promise<RefundResult> {
  const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1)
  if (!order) throw new RefundError("Order not found", "not_found")

  if (order.refundedAt)
    return {
      orderId: order.id,
      method: (order.refundMethod as RefundMethod) ?? "manual",
      reference: order.refundReference ?? "",
      alreadyRefunded: true,
    }

  if (!(REFUNDABLE as readonly string[]).includes(order.status))
    throw new RefundError(
      `An order in state "${order.status}" cannot be refunded`,
      "not_refundable",
    )

  const reference = await takeMoneyBack(order, input)

  // Record the refund before the status change, so an interruption between the
  // two leaves a refund that is recorded but not yet settled — recoverable and
  // visible, rather than a second refund being issued on retry.
  await db
    .update(orders)
    .set({
      refundMethod: input.method,
      refundReference: reference,
      refundedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, input.orderId))

  await markOrderRefunded(input.orderId)
  await notifyRefunded(input.orderId, input.method, reference)

  return {
    orderId: order.id,
    method: input.method,
    reference,
    alreadyRefunded: false,
  }
}

/**
 * Move the money back, or establish that it has already been moved.
 *
 * The provider call happens before anything is written, so a provider failure
 * leaves the order untouched.
 */
async function takeMoneyBack(
  order: {
    id: string
    number: string
    paymentMethod: string
    stripePaymentIntentId: string | null
  },
  input: RefundInput,
): Promise<string> {
  if (input.method === "stripe") {
    if (!order.stripePaymentIntentId)
      throw new RefundError(
        "This order has no Stripe payment to refund. Refund it manually and record why.",
        "payment_not_configured",
      )
    const provider: RefundProvider = input.provider ?? {
      refund: async (params) => {
        const refund = await stripe().refunds.create({
          payment_intent: params.payment_intent,
          metadata: { orderId: order.id, orderNumber: order.number },
        })
        return { id: refund.id }
      },
    }
    try {
      const refund = await provider.refund({ payment_intent: order.stripePaymentIntentId })
      return refund.id
    } catch (error) {
      logger.error("[refund] Stripe refund failed", error)
      throw new RefundError(
        "The payment provider refused the refund. Nothing has been changed.",
        "provider_failed",
      )
    }
  }

  if (input.method === "crypto") {
    // A crypto transfer cannot be reversed by the platform. The operator has
    // to say which outbound transaction paid the customer back.
    const hash = input.cryptoTxHash?.trim()
    if (!hash || hash.length < 16)
      throw new RefundError(
        "A crypto refund needs the outbound transaction hash.",
        "missing_reference",
      )
    return hash
  }

  const reason = input.reason?.trim()
  if (!reason || reason.length < 4)
    throw new RefundError(
      "A manual refund needs a reason, so the settlement can be audited later.",
      "missing_reason",
    )
  return reason
}

const REFUND_COPY = {
  en: {
    subject: (order: string) => `Refund issued — ${order}`,
    title: "Refund issued",
    body: "Your payment has been returned. If anything looks wrong, reply to this message.",
  },
  fi: {
    subject: (order: string) => `Hyvitetty tilaus — ${order}`,
    title: "Hyvitetty tilaus",
    body: "Maksu on palautettu. Jos jokin on epäselvää, vastaa tähän viestiin.",
  },
} as const

/**
 * Tell the customer their money is on the way back.
 *
 * Exported because a refund performed in the payment provider's dashboard
 * reaches the order through the provider's webhook, not through the admin
 * console, and the customer has to be told either way.
 */
export async function notifyRefunded(
  orderId: string,
  method: RefundMethod,
  reference: string,
): Promise<void> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!order) return
  const copy = order.locale === "fi" ? REFUND_COPY.fi : REFUND_COPY.en
  const detail =
    method === "crypto"
      ? `<p>Reference: <code>${escapeHtml(reference)}</code></p>`
      : method === "manual"
        ? `<p>Reference: ${escapeHtml(reference)}</p>`
        : ""
  await enqueueEmail(
    {
      to: order.email,
      subject: copy.subject(order.number),
      html: `<!doctype html><html lang="${order.locale === "fi" ? "fi" : "en"}"><head><meta charset="utf-8"></head><body style="font-family:system-ui;line-height:1.6;padding:24px;color:#182332"><main style="max-width:600px;margin:auto"><p>AverianLabs</p><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.body)}</p>${detail}<p>Order: <code>${escapeHtml(order.number)}</code></p></main></body></html>`,
    },
    `order-refunded:${orderId}`,
  )
}
