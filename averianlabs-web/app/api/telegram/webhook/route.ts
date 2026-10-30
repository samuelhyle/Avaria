import crypto from "node:crypto"
import { webhookEvents } from "@/db/schema"
import { db } from "@/lib/db"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { hasProcessedWebhookEvent, recordWebhookEvent } from "@/lib/orders/service"
import { isTelegramConfigured } from "@/lib/telegram/client"
import type { TelegramUpdate } from "@/lib/telegram/client"
import { apiSender, handleUpdate } from "@/lib/telegram/handlers"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

/**
 * Telegram webhook.
 *
 * Telegram POSTs every update here. The `X-Telegram-Bot-Api-Secret-Token`
 * header is compared in constant time with the configured secret, and the
 * update id is recorded in the same ledger the payment webhooks use, so a
 * Telegram retry never sends the same message twice.
 */
export async function POST(request: Request) {
  if (!isTelegramConfigured()) return NextResponse.json({ code: "not_configured" }, { status: 503 })

  const secret = getServerEnv().TELEGRAM_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ code: "not_configured" }, { status: 503 })
  const provided = request.headers.get("x-telegram-bot-api-secret-token") ?? ""
  const expected = Buffer.from(secret)
  const actual = Buffer.from(provided)
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual))
    return NextResponse.json({ code: "unauthorized" }, { status: 401 })

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null
  if (!update || typeof update.update_id !== "number")
    return NextResponse.json({ code: "invalid_input" }, { status: 400 })

  // The chat id is how an operator finds the team chat: add the bot to the
  // group, send it a message, and read the id from the log. Nothing else in
  // the application exposes it.
  const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id ?? undefined
  if (chatId !== undefined)
    logger.info(
      `[telegram] update ${update.update_id} from chat ${chatId}${update.message?.text ? `: ${update.message.text.slice(0, 60)}` : ""}`,
    )

  // Telegram retries a delivery it did not get a 2xx for. The ledger makes the
  // retry a no-op.
  if (await hasProcessedWebhookEvent("telegram", String(update.update_id)))
    return NextResponse.json({ ok: true, duplicate: true })

  try {
    await handleUpdate({ update, sender: apiSender })
    await recordWebhookEvent("telegram", String(update.update_id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error("[telegram] update failed", error)
    // Returning 200 stops Telegram from hammering a broken handler; the update
    // is not recorded, so it is safe to replay manually.
    return NextResponse.json({ code: "handler_failed" }, { status: 200 })
  }
}

/** Report the webhook state so an operator can see whether Telegram is talking to us. */
export async function GET() {
  if (!isTelegramConfigured()) return NextResponse.json({ code: "not_configured" }, { status: 503 })
  const recent = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(eq(webhookEvents.provider, "telegram"))
    .limit(1)
  return NextResponse.json({ ok: true, hasEvents: recent.length > 0 })
}
