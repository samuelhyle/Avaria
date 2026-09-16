import { users } from "@/db/schema"
import { TOKEN_TTL_MS, createToken, tokenIdentifiers } from "@/lib/auth/tokens"
import { db, isDatabaseConfigured } from "@/lib/db"
import { sendEmail, verifyEmailHtml } from "@/lib/email"
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
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Authentication is not available on this deployment." },
      { status: 503 },
    )
  }

  const ip = clientIp(req)
  const limit = await rateLimit(`register:ip:${ip}`, { limit: 5, window: "1 h" })
  if (!limit.success) {
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
  const resendKey = process.env.RESEND_API_KEY?.trim()

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

  await db.insert(users).values({
    email,
    name: parsed.data.name ?? null,
    passwordHash,
    locale: parsed.data.locale,
    role: "customer",
  })

  if (resendKey) {
    const token = await createToken(
      tokenIdentifiers.emailVerification(email),
      TOKEN_TTL_MS.emailVerification,
    )
    const origin = process.env.AUTH_URL?.trim() || new URL(req.url).origin
    const url = `${origin}/${parsed.data.locale}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    await sendEmail({
      to: email,
      subject: "Confirm your AverianLabs account",
      html: verifyEmailHtml({ url }),
    })
  }

  return NextResponse.json({ ok: true })
}
