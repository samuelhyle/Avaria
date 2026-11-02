import crypto from "node:crypto"
import { supportTickets } from "@/db/schema"
import { db } from "@/lib/db"
import { contactNotificationHtml } from "@/lib/email"
import { deliverEmailOutbox, enqueueEmail } from "@/lib/email/outbox"
import { locales } from "@/lib/i18n/config"
import { getLegalIdentity } from "@/lib/legal"
import { notifyOps } from "@/lib/ops/notify"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  locale: z.enum(locales).default("en"),
  name: z.string().min(2).max(200),
  email: z.string().email().max(254),
  subject: z.string().min(2).max(200),
  message: z.string().min(10).max(5000),
})

export async function POST(request: Request) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  const ip = clientIp(request)
  const limit = await rateLimit(`contact:ip:${ip}`, { limit: 5, window: "1 h" })
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
    return NextResponse.json({ error: "Invalid input." }, { status: 400 })
  }

  const { name, email, subject, message, locale } = parsed.data
  try {
    await db.transaction(async (tx) => {
      const id = crypto.randomUUID()
      await tx
        .insert(supportTickets)
        .values({ id, email, subject, body: message, locale, source: "email", status: "open" })
      await enqueueEmail(
        {
          to: getLegalIdentity().contactEmail,
          replyTo: email,
          subject,
          html: contactNotificationHtml({ name, email, subject, message, locale }),
        },
        `contact:${id}`,
        tx,
      )
    })
    await notifyOps({
      event: "contact",
      locale,
      name,
      email,
      subject,
      message,
    }).catch(() => undefined)
    await deliverEmailOutbox().catch(() => undefined)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "submission_failed" }, { status: 503 })
  }
}
