import crypto from "node:crypto"
import { newsletterSubscribers } from "@/db/schema"
import { hashToken } from "@/lib/auth/tokens"
import { db } from "@/lib/db"
import { actionEmailSubject, newsletterConfirmHtml } from "@/lib/email"
import { deliverEmailOutbox, enqueueEmail } from "@/lib/email/outbox"
import { getServerEnv } from "@/lib/env"
import { locales } from "@/lib/i18n/config"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000

const bodySchema = z.object({
  email: z.string().email().max(254),
  locale: z.enum(locales).default("en"),
})

export async function POST(request: Request) {
  const ip = clientIp(request)
  const limit = await rateLimit(`newsletter:ip:${ip}`, { limit: 10, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const locale = parsed.data.locale

  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`newsletter:${email}`}, 0))`,
      )
      const existing = await tx.query.newsletterSubscribers.findFirst({
        where: eq(newsletterSubscribers.email, email),
      })
      if (
        existing?.status === "confirmed" ||
        (existing?.status === "pending" &&
          existing.confirmExpiresAt &&
          existing.confirmExpiresAt > new Date())
      )
        return
      const token = crypto.randomBytes(32).toString("base64url")
      const values = {
        locale,
        status: "pending" as const,
        confirmToken: hashToken(token),
        confirmExpiresAt: new Date(Date.now() + CONFIRM_TTL_MS),
        updatedAt: new Date(),
      }
      if (existing)
        await tx
          .update(newsletterSubscribers)
          .set(values)
          .where(eq(newsletterSubscribers.email, email))
      else await tx.insert(newsletterSubscribers).values({ email, ...values })
      const origin = getServerEnv().AUTH_URL ?? new URL(request.url).origin
      const url = `${origin}/${locale}/newsletter/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
      await enqueueEmail(
        {
          to: email,
          subject: actionEmailSubject("newsletter", locale),
          html: newsletterConfirmHtml({ url, locale }),
        },
        `newsletter:${hashToken(token)}`,
        tx,
      )
    })
    await deliverEmailOutbox().catch(() => undefined)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "submission_failed" }, { status: 503 })
  }
}
