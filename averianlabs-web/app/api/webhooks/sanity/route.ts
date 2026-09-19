/**
 * POST /api/webhooks/sanity
 *
 * Reindexes a single glossary term or blog post when Sanity publishes or
 * deletes a document. Protected by HMAC-SHA256 signature verification.
 *
 * Sanity webhook config:
 *   URL:    https://<domain>/api/webhooks/sanity
 *   Header: x-sanity-signature: sha256=<hex>
 *   Filter: _type in ["glossaryTerm", "post"]
 */

import { createHmac, timingSafeEqual } from "node:crypto"
import { purgeSource, reindexDocument } from "@/lib/ai/rag/indexer"
import { logger } from "@/lib/logger"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export const runtime = "nodejs"

interface SanityWebhookBody {
  _type?: string
  _id?: string
  slug?: { current?: string } | string
  operation?: "create" | "update" | "delete"
}

const TYPE_TO_SOURCE: Record<string, "glossary" | "blog"> = {
  glossaryTerm: "glossary",
  post: "blog",
}

function slugOf(body: SanityWebhookBody): string | null {
  if (typeof body.slug === "string") return body.slug
  if (body.slug && typeof body.slug.current === "string") return body.slug.current
  return null
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false
  const [algo, sig] = signatureHeader.split("=")
  if (algo !== "sha256" || !sig) return false
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.SANITY_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("x-sanity-signature")
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 })
  }

  let body: SanityWebhookBody
  try {
    body = JSON.parse(rawBody) as SanityWebhookBody
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const source = body._type ? TYPE_TO_SOURCE[body._type] : undefined
  if (!source) {
    return NextResponse.json({ ok: true, skipped: "unsupported_type" })
  }

  const slug = slugOf(body)
  if (!slug) {
    return NextResponse.json({ error: "missing_slug" }, { status: 400 })
  }

  try {
    if (body.operation === "delete") {
      await purgeSource(source, [slug])
      return NextResponse.json({ ok: true, action: "purged", source, slug })
    }
    const report = await reindexDocument(source, slug)
    if (!report) {
      return NextResponse.json({ ok: true, skipped: "not_found_in_source" })
    }
    return NextResponse.json({ ok: true, action: "reindexed", source, slug, report })
  } catch (err) {
    logger.error("[sanity-webhook] reindex failed", err)
    return NextResponse.json({ error: "reindex_failed" }, { status: 500 })
  }
}
