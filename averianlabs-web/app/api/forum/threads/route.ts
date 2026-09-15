import { createThread, getCurrentMember, listThreads } from "@/lib/community"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const Body = z.object({
  categorySlug: z.string().min(1).max(64),
  title: z.string().min(6).max(140),
  body: z.string().min(1).max(8000),
})

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.trunc(parsed), min), max)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const categorySlug = url.searchParams.get("category") ?? undefined
  try {
    const threads = await listThreads({
      categorySlug: categorySlug || undefined,
      limit: clampInt(url.searchParams.get("limit"), 20, 1, 50),
      offset: clampInt(url.searchParams.get("offset"), 0, 0, 10_000),
    })
    return NextResponse.json({ threads })
  } catch {
    return NextResponse.json({ error: "Failed to load threads." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const member = await getCurrentMember()
  if (!member) {
    return NextResponse.json(
      { ok: false, reason: "Authentication required.", ruleCodes: ["unauth"] },
      { status: 401 },
    )
  }

  const limit = await rateLimit(`forum:thread:${member.id}`, { limit: 5, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json(
      { ok: false, reason: "Too many threads. Try again later.", ruleCodes: ["rate_limited"] },
      { status: 429 },
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Invalid JSON.", ruleCodes: ["bad_request"] },
      { status: 400 },
    )
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "Invalid input.", ruleCodes: ["bad_request"] },
      { status: 400 },
    )
  }

  try {
    const result = await createThread(parsed.data)
    if (!result.ok) return NextResponse.json(result, { status: 422 })
    return NextResponse.json(result, { status: 201 })
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Failed to create thread.", ruleCodes: [] },
      { status: 500 },
    )
  }
}
