import crypto from "node:crypto"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import {
  OrderError,
  getOrderById,
  hasProcessedWebhookEvent,
  markOrderFailed,
  markOrderPaid,
  recordCryptoTxHash,
  recordWebhookEvent,
} from "@/lib/orders"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const payloadSchema = z.object({
  event: z.object({
    id: z.string().min(1),
    type: z.string(),
    data: z.object({
      id: z.string(),
      metadata: z.object({ orderId: z.string().optional() }).optional(),
      pricing: z
        .object({ local: z.object({ amount: z.string(), currency: z.string() }) })
        .optional(),
      payments: z.array(z.object({ transaction_id: z.string().optional() })).optional(),
    }),
  }),
})

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-cc-webhook-signature")
  if (!signature) return NextResponse.json({ code: "no_signature" }, { status: 400 })
  const secret = getServerEnv().COINBASE_COMMERCE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ code: "webhook_unavailable" }, { status: 503 })
  const body = await request.text()
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex")
  if (
    !/^[a-f0-9]{64}$/.test(signature) ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return NextResponse.json({ code: "invalid_signature" }, { status: 400 })
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ code: "invalid_payload" }, { status: 400 })
  }
  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) return NextResponse.json({ code: "invalid_payload" }, { status: 400 })
  const event = parsed.data.event
  try {
    if (await hasProcessedWebhookEvent("coinbase", event.id))
      return NextResponse.json({ received: true })
    if (["charge:confirmed", "charge:failed"].includes(event.type)) {
      const id = event.data.metadata?.orderId
      const order = id ? await getOrderById(id) : null
      const price = event.data.pricing?.local
      if (
        !order ||
        order.paymentMethod !== "coinbase" ||
        (order.cryptoChargeId && order.cryptoChargeId !== event.data.id) ||
        !price ||
        !Number.isFinite(Number(price.amount)) ||
        Math.round(Number(price.amount) * 100) !== order.totalCents ||
        price.currency.toUpperCase() !== order.currency
      )
        throw new OrderError("Payment mismatch", "payment_mismatch")
      if (event.type === "charge:confirmed") {
        await markOrderPaid(order.id, event.data.id, "coinbase")
        const hash = event.data.payments?.[0]?.transaction_id
        if (hash) await recordCryptoTxHash(order.id, hash)
      } else await markOrderFailed(order.id)
    }
    await recordWebhookEvent("coinbase", event.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error("[coinbase] webhook processing failed", error)
    return NextResponse.json({ code: "processing_failed" }, { status: 500 })
  }
}
