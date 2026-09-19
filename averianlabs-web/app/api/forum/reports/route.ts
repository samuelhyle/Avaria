import { getCurrentMember, reportPost } from "@/lib/community"
import { isDatabaseConfigured } from "@/lib/db"
import { assertCsrfOr403 } from "@/lib/security/csrf"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const Body = z.object({
  postId: z.string().min(1).max(64),
  reason: z.string().min(3).max(200),
  detail: z.string().max(1000).optional(),
})

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "Community is offline." }, { status: 503 })
  }
  const csrf = assertCsrfOr403(req, { allowDevHosts: process.env.NODE_ENV !== "production" })
  if (csrf) return csrf

  const member = await getCurrentMember()
  if (!member) {
    return NextResponse.json({ ok: false, reason: "Authentication required." }, { status: 401 })
  }

  const limit = await rateLimit(`forum:report:${member.id}`, { limit: 10, window: "1 h" })
  if (!limit.success) {
    return NextResponse.json({ ok: false, reason: "Too many reports." }, { status: 429 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON." }, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "Invalid input." }, { status: 400 })
  }

  try {
    const result = await reportPost(parsed.data)
    if (!result.ok) return NextResponse.json(result, { status: 422 })
    return NextResponse.json(result, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, reason: "Failed to submit report." }, { status: 500 })
  }
}
