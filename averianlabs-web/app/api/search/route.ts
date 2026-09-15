import { searchProducts } from "@/lib/search/meilisearch"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"

function toInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.trunc(parsed), min), max)
}

export async function GET(req: Request) {
  const limit = await rateLimit(`search:ip:${clientIp(req)}`, {
    limit: 120,
    window: "1 m",
  })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const locale = searchParams.get("locale") ?? "en"
  const category = searchParams.get("category") ?? undefined
  const inStock = searchParams.get("inStock") ? searchParams.get("inStock") === "true" : undefined
  const minPriceParam = searchParams.get("minPrice")
  const maxPriceParam = searchParams.get("maxPrice")
  const minPrice = minPriceParam ? Number(minPriceParam) : undefined
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined
  const sort = searchParams.get("sort") ?? undefined

  if (!q || q.length < 2) {
    return NextResponse.json({ hits: [], total: 0, facets: {}, processingTime: 0 })
  }

  const results = await searchProducts(q.slice(0, 120), {
    locale,
    category,
    inStock,
    minPrice:
      minPrice !== undefined && Number.isFinite(minPrice) ? Math.max(0, minPrice) : undefined,
    maxPrice:
      maxPrice !== undefined && Number.isFinite(maxPrice) ? Math.max(0, maxPrice) : undefined,
    sort,
    limit: toInt(searchParams.get("limit"), 20, 1, 50),
    offset: toInt(searchParams.get("offset"), 0, 0, 10_000),
  })

  return NextResponse.json(results)
}
