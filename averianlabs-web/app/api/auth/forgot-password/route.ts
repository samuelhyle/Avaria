import { users } from "@/db/schema"
import { TOKEN_TTL_MS, createToken, tokenIdentifiers } from "@/lib/auth/tokens"
import { db } from "@/lib/db"
import { passwordResetHtml, sendEmail } from "@/lib/email"
import { getServerEnv } from "@/lib/env"
import { locales } from "@/lib/i18n/config"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  email: z.string().email().max(254),
  locale: z.enum(locales).default("en"),
})

export async function POST(req: Request) {
  const ip = clientIp(req)
  const ipLimit = await rateLimit(`forgot:ip:${ip}`, { limit: 10, window: "1 h" })
  const ok = NextResponse.json({ ok: true })

  if (!ipLimit.success) return ok

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

  const env = getServerEnv()
  if (env.RESEND_API_KEY) {
    const token = await createToken(
      tokenIdentifiers.passwordReset(email),
      TOKEN_TTL_MS.passwordReset,
    )
    const origin = env.AUTH_URL ?? new URL(req.url).origin
    const url = `${origin}/${parsed.data.locale}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    await sendEmail({
      to: email,
      subject: "Reset your AverianLabs password",
      html: passwordResetHtml({ url }),
    })
  }

  return ok
}
