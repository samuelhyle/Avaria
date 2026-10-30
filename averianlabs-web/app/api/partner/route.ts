import { partnerApplications } from "@/db/schema"
import { db } from "@/lib/db"
import { contactNotificationHtml } from "@/lib/email"
import { deliverEmailOutbox, enqueueEmail } from "@/lib/email/outbox"
import { locales } from "@/lib/i18n/config"
import { getLegalIdentity } from "@/lib/legal"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.object({
  locale: z.enum(locales).default("en"),
  orgName: z.string().min(2).max(200),
  contactEmail: z.string().email().max(254),
  country: z.string().min(2).max(100),
  useCase: z.string().max(2000).optional(),
  volume: z.number().int().min(0).optional(),
})

export async function POST(request: Request) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  const limit = await rateLimit(`partner:ip:${clientIp(request)}`, { limit: 5, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid application." }, { status: 400 })
  }

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(partnerApplications)
        .values({
          orgName: parsed.orgName,
          contactEmail: parsed.contactEmail,
          country: parsed.country,
          useCase: parsed.useCase ?? null,
          volume: parsed.volume ?? null,
        })
        .returning({ id: partnerApplications.id })
      if (!row) throw new Error("application_not_saved")
      await enqueueEmail(
        {
          to: getLegalIdentity().contactEmail,
          replyTo: parsed.contactEmail,
          subject: parsed.orgName,
          html: contactNotificationHtml({
            name: parsed.orgName,
            email: parsed.contactEmail,
            subject: parsed.orgName,
            message: `${parsed.country}\n${parsed.useCase ?? ""}\n${parsed.volume ?? ""}`,
            locale: parsed.locale,
          }),
        },
        `partner:${row.id}`,
        tx,
      )
    })
    await deliverEmailOutbox().catch(() => undefined)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[partner] application failed", err)
    return NextResponse.json({ error: "Failed to submit application." }, { status: 500 })
  }
}
