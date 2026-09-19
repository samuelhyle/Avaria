import crypto from "node:crypto"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import {
  forgetWebhookEvent,
  getOrderSkuQuantities,
  markOrderFailed,
  markOrderPaid,
  recordCryptoTxHash,
  recordWebhookEvent,
  restoreStock,
  sendOrderConfirmationEmail,
} from "@/lib/orders"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { type NextRequest, NextResponse } from "next/server"

interface CoinbaseWebhookPayload {
  event?: {
    id?: string
    type?: string
    data?: {
      id?: string
      metadata?: { orderId?: string; orderNumber?: string }
      payments?: Array<{ transaction_id?: string }>
    }
  }
}

export async function POST(req: NextRequest) {
  // Per-IP rate guard — Coinbase retries are spaced by seconds; a sustained
  // burst from one IP usually means the upstream is misconfigured (HMAC
  // rejected → fixed → resending) or someone is replaying.
  const ip = clientIp(req)
  const limit = await rateLimit(`webhook:coinbase:${ip}`, { limit: 1000, window: "1 m" })
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  const sig = req.headers.get("x-cc-webhook-signature")
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 })

  const secret = getServerEnv().COINBASE_COMMERCE_WEBHOOK_SECRET
  if (!secret) {
    logger.error("[coinbase] COINBASE_COMMERCE_WEBHOOK_SECRET is not configured")
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 })
  }

  const body = await req.text()
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex")

  const provided = Buffer.from(sig)
  const wanted = Buffer.from(expected)
  if (provided.length !== wanted.length || !crypto.timingSafeEqual(provided, wanted)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  let payload: CoinbaseWebhookPayload
  try {
    payload = JSON.parse(body) as CoinbaseWebhookPayload
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }

  const event = payload.event
  if (!event?.id || typeof event.id !== "string" || !event.type) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }

  // At-least-once delivery: process each event id exactly once.
  if (!(await recordWebhookEvent("coinbase", event.id))) {
    return NextResponse.json({ received: true })
  }

  try {
    const orderId = event.data?.metadata?.orderId
    switch (event.type) {
      case "charge:confirmed": {
        if (!orderId) break
        const chargeId = event.data?.id ?? event.id
        if (await markOrderPaid(orderId, chargeId, "coinbase")) {
          const txHash = event.data?.payments?.[0]?.transaction_id
          if (txHash) await recordCryptoTxHash(orderId, txHash)
          await sendOrderConfirmationEmail(orderId)
        }
        break
      }
      case "charge:failed": {
        // Coinbase charges are final once failed — release reserved stock.
        if (orderId && (await markOrderFailed(orderId))) {
          await restoreStock(await getOrderSkuQuantities(orderId))
        }
        break
      }
    }
  } catch (err) {
    await forgetWebhookEvent("coinbase", event.id).catch(() => {})
    logger.error("[coinbase] handler failed", err)
    return NextResponse.json({ error: "processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
