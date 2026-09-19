import { users } from "@/db/schema"
import { TOKEN_TTL_MS, createToken, tokenIdentifiers } from "@/lib/auth/tokens"
import { db, isDatabaseConfigured } from "@/lib/db"
import { passwordResetHtml, sendEmail } from "@/lib/email"
import { locales } from "@/lib/i18n/config"
import { assertCsrfOr403 } from "@/lib/security/csrf"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"
import { getTranslations } from "next-intl/server"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  email: z.string().email().max(254),
  locale: z.enum(locales).default("en"),
})

export async function POST(req: Request) {
  const csrf = assertCsrfOr403(req, { allowDevHosts: process.env.NODE_ENV !== "production" })
  if (csrf) return csrf

  const ip = clientIp(req)
  const ipLimit = await rateLimit(`forgot:ip:${ip}`, { limit: 10, window: "1 h" })
  const ok = NextResponse.json({ ok: true })

  if (!ipLimit.success) return ok
  // Always return the same response — no account enumeration. When the
  // deployment has no database configured, the route still answers `ok`
  // so the form UX is identical to a successful submission.
  if (!isDatabaseConfigured()) return ok

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return ok

  const email = parsed.data.email.trim().toLowerCase()
  const emailLimit = await rateLimit(`forgot:email:${email}`, { limit: 3, window: "1 h" })
  if (!emailLimit.success) return ok

  // Always return the same response — no account enumeration.
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, passwordHash: true, deletedAt: true },
  })
  if (!user?.passwordHash || user.deletedAt) return ok

  if (process.env.RESEND_API_KEY?.trim()) {
    const token = await createToken(
      tokenIdentifiers.passwordReset(email),
      TOKEN_TTL_MS.passwordReset,
    )
    const origin = process.env.AUTH_URL?.trim() || new URL(req.url).origin
    const url = `${origin}/${parsed.data.locale}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    const t = await getTranslations({ locale: parsed.data.locale, namespace: "email" })
    const html = await passwordResetHtml({ url, locale: parsed.data.locale })
    await sendEmail({
      to: email,
      subject: t("resetPasswordSubject"),
      html,
    })
  }

  return ok
}
