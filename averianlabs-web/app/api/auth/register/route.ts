import { users } from "@/db/schema"
import { TOKEN_TTL_MS, createToken, tokenIdentifiers } from "@/lib/auth/tokens"
import { db } from "@/lib/db"
import { actionEmailSubject, verifyEmailHtml } from "@/lib/email"
import { deliverEmailOutbox, enqueueEmail } from "@/lib/email/outbox"
import { getServerEnv } from "@/lib/env"
import { locales } from "@/lib/i18n/config"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { hash } from "argon2"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10, "Password must be at least 10 characters").max(200),
  name: z.string().min(1).max(120).optional(),
  locale: z.enum(locales).default("en"),
})

export async function POST(req: Request) {
  const ip = clientIp(req)
  // Two limits. The per-IP one stops a single host from creating accounts in
  // bulk; the per-email one is the real defence against one person registering
  // many addresses, and it is the one that survives a shared or rotating IP.
  const ipLimit = await rateLimit(`register:ip:${ip}`, { limit: 10, window: "1 h" })
  if (!ipLimit.success) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const env = getServerEnv()

  const emailLimit = await rateLimit(`register:email:${email}`, { limit: 3, window: "1 h" })
  if (!emailLimit.success) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, passwordHash: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    )
  }

  const passwordHash = await hash(parsed.data.password)

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      email,
      name: parsed.data.name ?? null,
      passwordHash,
      locale: parsed.data.locale,
      role: "customer",
    })

    const token = await createToken(
      tokenIdentifiers.emailVerification(email),
      TOKEN_TTL_MS.emailVerification,
      tx,
    )
    const origin = env.AUTH_URL ?? new URL(req.url).origin
    const locale = parsed.data.locale
    const url = `${origin}/${locale}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    await enqueueEmail(
      {
        to: email,
        subject: actionEmailSubject("verify", locale),
        html: verifyEmailHtml({ url, locale }),
      },
      `verify:${token}`,
      tx,
    )
  })
  await deliverEmailOutbox().catch(() => undefined)

  return NextResponse.json({ ok: true })
}
