import { quoteRequests, supportTickets, vials } from "@/db/schema"
import { db } from "@/lib/db"
import { escapeHtml } from "@/lib/email/html"
import { enqueueEmail } from "@/lib/email/outbox"
import { locales } from "@/lib/i18n/config"
import { products } from "@/lib/products/data"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
  requestKey: z.string().uuid(),
  sku: z.string().min(1).max(64),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  organisation: z.string().max(200).default(""),
  message: z.string().max(2000).default(""),
  locale: z.enum(locales).default("en"),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "invalid_input" }, { status: 400 })
  if (!(await rateLimit(`quote:${clientIp(request)}`, { limit: 10, window: "1 h" })).success)
    return NextResponse.json({ code: "rate_limited" }, { status: 429 })
  try {
    const input = parsed.data
    const knownVial = await db
      .select({ sku: vials.sku })
      .from(vials)
      .where(eq(vials.sku, input.sku))
      .limit(1)
    if (!knownVial.length && !products.some((p) => p.vials.some((v) => v.sku === input.sku)))
      return NextResponse.json({ code: "unknown_sku" }, { status: 400 })
    const result = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(quoteRequests)
        .values(input)
        .onConflictDoNothing({ target: quoteRequests.requestKey })
        .returning()
      if (!created) {
        const [existing] = await tx
          .select()
          .from(quoteRequests)
          .where(eq(quoteRequests.requestKey, input.requestKey))
        if (
          !existing ||
          existing.sku !== input.sku ||
          existing.email !== input.email ||
          existing.name !== input.name ||
          existing.organisation !== input.organisation ||
          existing.message !== input.message ||
          existing.locale !== input.locale
        )
          return null
        return existing.id
      }
      const subject = `${input.locale === "fi" ? "Tarjouspyyntö" : "Quote request"}: ${input.sku}`
      const body = `${input.name}\n${input.organisation}\n${input.sku}\n${input.message}`
      await tx.insert(supportTickets).values({
        id: created.id,
        email: input.email,
        subject,
        body,
        locale: input.locale,
        source: "quote",
        status: "open",
      })
      await enqueueEmail(
        {
          to: process.env.SUPPORT_EMAIL ?? "support@averianlabs.eu",
          replyTo: input.email,
          subject,
          html: `<h1>${escapeHtml(subject)}</h1><p>${escapeHtml(input.email)}</p><pre>${escapeHtml(body)}</pre>`,
        },
        `quote:${created.id}`,
        tx,
      )
      return created.id
    })
    return result
      ? NextResponse.json({ ok: true, requestId: result }, { status: 201 })
      : NextResponse.json({ code: "idempotency_conflict" }, { status: 409 })
  } catch {
    return NextResponse.json({ code: "quote_unavailable" }, { status: 503 })
  }
}
