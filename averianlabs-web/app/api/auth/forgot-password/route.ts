import { users } from "@/db/schema"
import { TOKEN_TTL_MS, createToken, tokenIdentifiers } from "@/lib/auth/tokens"
import { db } from "@/lib/db"
import { actionEmailSubject, passwordResetHtml } from "@/lib/email"
import { deliverEmailOutbox, enqueueEmail } from "@/lib/email/outbox"
import { getServerEnv } from "@/lib/env"
import { locales } from "@/lib/i18n/config"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
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
  const csrf = assertCsrfOr403(req, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

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
  await db.transaction(async (tx) => {
    const token = await createToken(
      tokenIdentifiers.passwordReset(email),
      TOKEN_TTL_MS.passwordReset,
      tx,
    )
    const origin = env.AUTH_URL ?? new URL(req.url).origin
    const locale = parsed.data.locale
    const url = `${origin}/${locale}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    await enqueueEmail(
      {
        to: email,
        subject: actionEmailSubject("reset", locale),
        html: passwordResetHtml({ url, locale }),
      },
      `reset:${token}`,
      tx,
    )
  })
  await deliverEmailOutbox().catch(() => undefined)

  return ok
}
