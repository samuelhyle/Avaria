import { productWaitlist, vials } from "@/db/schema"
import { db } from "@/lib/db"
import { locales } from "@/lib/i18n/config"
import { notifyOps } from "@/lib/ops/notify"
import { products } from "@/lib/products/data"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
  sku: z.string().min(1).max(64),
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(120).default(""),
  locale: z.enum(locales).default("en"),
})

/**
 * Availability notifications.
 *
 * The product page promises to email a shopper when a lot is released. This
 * is where that promise is kept: the address is recorded against the SKU, and
 * the release sweep reads the list.
 */
export async function POST(request: Request) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ code: "invalid_input" }, { status: 400 })
  if (!(await rateLimit(`waitlist:${clientIp(request)}`, { limit: 10, window: "1 h" })).success)
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

    const [saved] = await db
      .insert(productWaitlist)
      .values({
        sku: input.sku,
        email: input.email,
        name: input.name || null,
        locale: input.locale,
      })
      .onConflictDoUpdate({
        target: [productWaitlist.sku, productWaitlist.email],
        set: { name: input.name || null, locale: input.locale, status: "open", notifiedAt: null },
      })
      .returning({ id: productWaitlist.id })

    await notifyOps({
      event: "waitlist",
      locale: input.locale,
      name: input.name,
      email: input.email,
      subject: input.sku,
    }).catch(() => undefined)

    return NextResponse.json({ ok: true, requestId: saved?.id ?? null }, { status: 201 })
  } catch {
    return NextResponse.json({ code: "waitlist_unavailable" }, { status: 503 })
  }
}
