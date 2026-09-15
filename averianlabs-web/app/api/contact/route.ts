import crypto from "node:crypto"
import { supportTickets } from "@/db/schema"
import { db } from "@/lib/db"
import { contactNotificationHtml, sendEmail } from "@/lib/email"
import { getServerEnv } from "@/lib/env"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(254),
  subject: z.string().min(2).max(200),
  message: z.string().min(10).max(5000),
})

export async function POST(request: Request) {
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

  const { name, email, subject, message } = parsed.data

  await db.insert(supportTickets).values({
    id: crypto.randomUUID(),
    email,
    subject,
    body: message,
    source: "email",
    status: "open",
  })

  const env = getServerEnv()
  if (env.RESEND_API_KEY) {
    await sendEmail({
      to: "support@averianlabs.eu",
      replyTo: email,
      subject: `[Contact] ${subject}`,
      html: contactNotificationHtml({ name, email, subject, message }),
    })
  }

  return NextResponse.json({ ok: true })
}
