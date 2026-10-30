import { newsletterSubscribers } from "@/db/schema"
import { db } from "@/lib/db"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

/**
 * Unsubscribe from the newsletter.
 *
 * There was no way to leave at all: the schema had `unsubscribed_at` and a
 * `status` that could be `unsubscribed`, but nothing ever wrote them. A
 * subscriber who wanted out had to write to support, and the record kept
 * saying they were subscribed.
 *
 * The address is enough: this is an opt-out, so it must never be harder than
 * replying to the newsletter. The response is the same whether or not the
 * address is on the list, so the endpoint cannot be used to discover who
 * subscribes.
 */
export async function POST(request: Request) {
  const csrf = assertCsrfOr403(request, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  const ip = clientIp(request)
  const limit = await rateLimit(`newsletter:unsubscribe:${ip}`, { limit: 20, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  let email: string | null = null
  try {
    const body = (await request.json()) as { email?: unknown }
    if (typeof body.email === "string") email = body.email.trim().toLowerCase()
  } catch {
    email = null
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 })
  }

  await db
    .update(newsletterSubscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date(), updatedAt: new Date() })
    .where(eq(newsletterSubscribers.email, email))

  return NextResponse.json({ ok: true })
}
