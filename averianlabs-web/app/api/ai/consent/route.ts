/**
 * POST /api/ai/consent
 *
 * Sets the GDPR consent cookie for Averia conversation storage.
 * Body: { state: "accepted" | "declined" }
 */

import { CONSENT_COOKIE } from "@/lib/ai/memory/cookies"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

const bodySchema = z.object({
  state: z.enum(["accepted", "declined"]),
})

export async function POST(request: Request): Promise<NextResponse> {
  const limit = await rateLimit(`ai:consent:${clientIp(request)}`, { limit: 30, window: "1 m" })
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true, state: body.state })
  res.cookies.set({
    name: CONSENT_COOKIE,
    value: body.state,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    httpOnly: false, // Readable by client to reflect UI state
    secure: process.env.NODE_ENV === "production",
  })
  return res
}
