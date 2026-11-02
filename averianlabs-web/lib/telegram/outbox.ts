import { telegramOutbox } from "@/db/schema"
import { db } from "@/lib/db"
import {
  editTelegramMessage,
  isTelegramConfigured,
  sendTelegramMessage,
} from "@/lib/telegram/client"
import { and, asc, eq, isNull, lte, ne, or, sql } from "drizzle-orm"

/**
 * Telegram delivery queue.
 *
 * Mirrors `lib/email/outbox.ts`: a dedupe key makes every message
 * exactly-once, a lease stops two workers claiming the same row, and a failed
 * send backs off exponentially. The cron route drains it.
 */

/**
 * How many times a message is attempted before it is abandoned. A message that
 * keeps failing — a revoked bot token, a deleted chat — would otherwise retry
 * for ever and hold the queue.
 */
const MAX_DELIVERY_ATTEMPTS = 8

export interface TelegramMessageInput {
  chatId: string | number
  text: string
  /** When set, the message replaces an earlier one instead of being posted. */
  replacesMessageId?: string | number | null
  parseMode?: "HTML" | "MarkdownV2"
}

export async function enqueueTelegramMessage(
  message: TelegramMessageInput,
  dedupeKey: string,
): Promise<void> {
  await db
    .insert(telegramOutbox)
    .values({
      dedupeKey,
      chatId: String(message.chatId),
      text: message.text,
      parseMode: message.parseMode ?? "HTML",
      replacesMessageId:
        message.replacesMessageId === undefined || message.replacesMessageId === null
          ? null
          : String(message.replacesMessageId),
    })
    .onConflictDoNothing({ target: telegramOutbox.dedupeKey })
}

export async function deliverTelegramOutbox(
  limit = 20,
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  if (!isTelegramConfigured()) return { sent: 0, failed: 0, skipped: true }
  const claimed = await db.transaction(async (tx) => {
    const now = new Date()
    const rows = await tx
      .select()
      .from(telegramOutbox)
      .where(
        and(
          ne(telegramOutbox.status, "sent"),
          // A message that keeps failing is abandoned rather than retried for
          // ever: a poison row would otherwise loop until it blocks the queue.
          ne(telegramOutbox.status, "failed"),
          sql`${telegramOutbox.attempts} < ${MAX_DELIVERY_ATTEMPTS}`,
          lte(telegramOutbox.nextAttemptAt, now),
          or(isNull(telegramOutbox.leaseUntil), lte(telegramOutbox.leaseUntil, now)),
        ),
      )
      // The oldest overdue row goes first. Without an order the queue takes
      // whatever the database returns, and a row that can never be delivered
      // — a chat that no longer exists — can sit in front of a real lead for
      // every attempt it has left.
      .orderBy(asc(telegramOutbox.nextAttemptAt))
      .limit(limit)
      .for("update", { skipLocked: true })
    for (const row of rows)
      await tx
        .update(telegramOutbox)
        .set({
          status: "sending",
          leaseUntil: new Date(now.getTime() + 5 * 60_000),
          attempts: sql`${telegramOutbox.attempts} + 1`,
        })
        .where(eq(telegramOutbox.id, row.id))
    return rows
  })
  let sent = 0
  let failed = 0
  for (const row of claimed) {
    try {
      if (row.replacesMessageId) {
        try {
          await editTelegramMessage({
            chatId: row.chatId,
            messageId: Number(row.replacesMessageId),
            text: row.text,
            parseMode: row.parseMode === "MarkdownV2" ? "MarkdownV2" : "HTML",
          })
        } catch {
          // The message could not be edited — it may be too old, or the bot may
          // not be allowed to edit it. Post a new message instead: the buyer
          // must never be left without the payment confirmation.
          await sendTelegramMessage({
            chatId: row.chatId,
            text: row.text,
            parseMode: row.parseMode === "MarkdownV2" ? "MarkdownV2" : "HTML",
          })
        }
      } else {
        await sendTelegramMessage({
          chatId: row.chatId,
          text: row.text,
          parseMode: row.parseMode === "MarkdownV2" ? "MarkdownV2" : "HTML",
        })
      }
      await db
        .update(telegramOutbox)
        .set({ status: "sent", sentAt: new Date(), leaseUntil: null, lastError: null })
        .where(eq(telegramOutbox.id, row.id))
      sent++
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 200) : "delivery_failed"
      const exhausted = row.attempts + 1 >= MAX_DELIVERY_ATTEMPTS
      await db
        .update(telegramOutbox)
        .set({
          status: exhausted ? "failed" : "pending",
          leaseUntil: null,
          nextAttemptAt: new Date(
            Date.now() + Math.min(60, 2 ** Math.min(row.attempts + 1, 6)) * 60_000,
          ),
          lastError: message,
        })
        .where(eq(telegramOutbox.id, row.id))
      failed++
    }
  }
  return { sent, failed, skipped: false }
}
