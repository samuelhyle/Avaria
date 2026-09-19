import crypto from "node:crypto"
import { supportTickets } from "@/db/schema"
import { db, isDatabaseConfigured } from "@/lib/db"
import { contactNotificationHtml, sendEmail } from "@/lib/email"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { assertCsrfOr403 } from "@/lib/security/csrf"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(254),
  subject: z.string().min(2).max(200),
  message: z.string().min(10).max(5000),
  locale: z.enum(["en", "fi", "de", "sv", "nl"]).default("en"),
})

export async function POST(request: Request) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: process.env.NODE_ENV !== "production" })
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
    if (isDatabaseConfigured()) {
      await db.insert(supportTickets).values({
        id: crypto.randomUUID(),
        email,
        subject,
        body: message,
        source: "email",
        status: "open",
      })
    }
    // Always send the notification email (when configured) — the contact
    // form should still deliver messages even if the DB is unconfigured,
    // so a team-member's email is the durable record.
    const env = getServerEnv()
    if (env.RESEND_API_KEY) {
      const html = await contactNotificationHtml({ name, email, subject, message, locale })
      const ok = await sendEmail({
        to: "support@averianlabs.eu",
        replyTo: email,
        subject: `[Contact] ${subject}`,
        html,
      })
      // If neither DB nor email worked, surface the failure to the caller
      // — otherwise the message just disappears silently.
      if (!ok && !isDatabaseConfigured()) {
        return NextResponse.json(
          { error: "Contact form is offline on this deployment." },
          { status: 503 },
        )
      }
    } else if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: "Contact form is offline on this deployment." },
        { status: 503 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    // Never leak DB stack traces to the client. The error log retains
    // enough context for ops to debug from the function log.
    logger.error("[contact] submit failed", err)
    return NextResponse.json({ error: "Submit failed." }, { status: 500 })
  }
}
