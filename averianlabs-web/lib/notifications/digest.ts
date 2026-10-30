import { notificationPreferences, notifications, users } from "@/db/schema"
import { db } from "@/lib/db"
import { escapeHtml } from "@/lib/email/html"
import { enqueueEmail } from "@/lib/email/outbox"
import { and, eq, isNull, lt, sql } from "drizzle-orm"

/**
 * The email digest.
 *
 * The account settings offered an "email digest" switch that nothing acted on.
 * This is the thing that acts on it.
 *
 * A digest covers the notifications a customer did not open in the app. Each
 * notification is included exactly once — `digested_at` records that it has
 * been sent — and nothing is sent before it is a day old, so a customer is not
 * emailed about something that is still waiting in the inbox.
 */

const DIGEST_AGE_MS = 24 * 60 * 60_000
const DIGEST_BATCH = 200

export interface DigestResult {
  users: number
  notifications: number
  sent: number
}

const DIGEST_COPY = {
  en: {
    subject: "Your AverianLabs notifications",
    title: "You have notifications waiting",
    intro: "Here is what happened while you were away.",
    empty: "There is nothing new to report.",
    footer: "Turn the digest off in your account settings.",
  },
  fi: {
    subject: "AverianLabsin ilmoituksesi",
    title: "Sinua odottaa ilmoituksia",
    intro: "Näin tilanne, kun et ollut paikalla.",
    empty: "Ei uutta raportoitavaa.",
    footer: "Voit lopettaa tiivistelmän tilisi asetuksista.",
  },
} as const

export async function sendNotificationDigests(now = new Date()): Promise<DigestResult> {
  const cutoff = new Date(now.getTime() - DIGEST_AGE_MS)
  const recipients = await db
    .select({
      userId: notificationPreferences.userId,
      email: users.email,
      locale: users.locale,
    })
    .from(notificationPreferences)
    .innerJoin(users, eq(users.id, notificationPreferences.userId))
    .where(eq(notificationPreferences.emailDigest, true))
    .limit(DIGEST_BATCH)

  let sent = 0
  let count = 0
  for (const recipient of recipients) {
    const pending = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, recipient.userId),
          isNull(notifications.digestedAt),
          lt(notifications.createdAt, cutoff),
        ),
      )
      .limit(50)
    if (!pending.length) continue

    const locale = recipient.locale === "fi" ? "fi" : "en"
    const copy = DIGEST_COPY[locale]
    const items = pending
      .map((item) => {
        const label = item.targetTitle ?? item.kind
        const who = item.actorName ? `${item.actorName} · ` : ""
        return `<li style="margin:0 0 8px">${escapeHtml(who + label)}${
          item.preview
            ? `<br><span style="color:#5b6b85;font-size:13px">${escapeHtml(item.preview)}</span>`
            : ""
        }</li>`
      })
      .join("")

    const first = pending[0]
    if (!first) continue
    await enqueueEmail(
      {
        to: recipient.email,
        subject: copy.subject,
        html: `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"></head><body style="font-family:system-ui;line-height:1.6;padding:24px;color:#182332"><main style="max-width:600px;margin:auto"><p>AverianLabs</p><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.intro)}</p><ul style="padding-left:18px">${items}</ul><p style="font-size:12px;color:#5b6b85">${escapeHtml(copy.footer)}</p></main></body></html>`,
      },
      `notification-digest:${recipient.userId}:${first.id}`,
    )

    // Mark them as sent so the next run does not repeat them.
    const ids = pending.map((item) => item.id)
    await db
      .update(notifications)
      .set({ digestedAt: now })
      .where(
        sql`${notifications.id} in (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      )
    sent++
    count += pending.length
  }

  return { users: recipients.length, notifications: count, sent }
}
