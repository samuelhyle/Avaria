import crypto from "node:crypto"
import { newsletterSubscribers } from "@/db/schema"
import { hashToken } from "@/lib/auth/tokens"
import { db } from "@/lib/db"
import { newsletterConfirmHtml, sendEmail } from "@/lib/email"
import { getServerEnv } from "@/lib/env"
import { locales } from "@/lib/i18n/config"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"
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

  const existing = await db.query.newsletterSubscribers.findFirst({
    where: eq(newsletterSubscribers.email, email),
    columns: { status: true },
  })

  // Already confirmed — nothing to do, and no duplicate email.
  if (existing?.status === "confirmed") {
    return NextResponse.json({ ok: true })
  }

  const token = crypto.randomBytes(32).toString("base64url")
  const tokenHash = hashToken(token)
  const expires = new Date(Date.now() + CONFIRM_TTL_MS)

  if (existing) {
    await db
      .update(newsletterSubscribers)
      .set({
        locale,
        status: "pending",
        confirmToken: tokenHash,
        confirmExpiresAt: expires,
        updatedAt: new Date(),
      })
      .where(eq(newsletterSubscribers.email, email))
  } else {
    await db.insert(newsletterSubscribers).values({
      email,
      locale,
      status: "pending",
      confirmToken: tokenHash,
      confirmExpiresAt: expires,
    })
  }

  const env = getServerEnv()
  if (env.RESEND_API_KEY) {
    const origin = env.AUTH_URL ?? new URL(request.url).origin
    const url = `${origin}/${locale}/newsletter/confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    await sendEmail({
      to: email,
      subject: "Confirm your AverianLabs subscription",
      html: newsletterConfirmHtml({ url }),
    })
  }

  return NextResponse.json({ ok: true })
}
