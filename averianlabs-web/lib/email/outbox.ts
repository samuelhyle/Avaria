import { emailOutbox } from "@/db/schema"
import { db } from "@/lib/db"
import { and, eq, isNull, lte, ne, or, sql } from "drizzle-orm"
import { sendEmail } from "./index"

export type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function enqueueEmail(message: { to: string; subject: string; html: string; replyTo?: string }, dedupeKey: string, executor: DbExecutor = db) {
  await executor.insert(emailOutbox).values({ dedupeKey, recipient: message.to, replyTo: message.replyTo, subject: message.subject, html: message.html }).onConflictDoNothing({ target: emailOutbox.dedupeKey })
}

/** Short leases permit recovery after process failure. Provider keys prevent duplicate delivery. */
export async function deliverEmailOutbox(limit = 10): Promise<{ sent: number; failed: number }> {
  if (!process.env.RESEND_API_KEY) return { sent: 0, failed: 0 }
  const claimed = await db.transaction(async (tx) => {
    const now = new Date()
    const rows = await tx.select().from(emailOutbox).where(and(ne(emailOutbox.status, "sent"), lte(emailOutbox.nextAttemptAt, now), or(isNull(emailOutbox.leaseUntil), lte(emailOutbox.leaseUntil, now)))).limit(limit).for("update", { skipLocked: true })
    for (const row of rows) await tx.update(emailOutbox).set({ status: "sending", leaseUntil: new Date(now.getTime() + 5 * 60_000), attempts: sql`${emailOutbox.attempts} + 1` }).where(eq(emailOutbox.id, row.id))
    return rows
  })
  let sent = 0
  let failed = 0
  for (const row of claimed) {
    const delivered = await sendEmail({ to: row.recipient, subject: row.subject, html: row.html, replyTo: row.replyTo ?? undefined, idempotencyKey: row.id })
    if (delivered) {
      await db.update(emailOutbox).set({ status: "sent", sentAt: new Date(), leaseUntil: null, lastError: null }).where(eq(emailOutbox.id, row.id))
      sent++
    } else {
      await db.update(emailOutbox).set({ status: "pending", leaseUntil: null, nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** Math.min(row.attempts + 1, 6)) * 60_000), lastError: "provider_delivery_failed" }).where(eq(emailOutbox.id, row.id))
      failed++
    }
  }
  return { sent, failed }
}
