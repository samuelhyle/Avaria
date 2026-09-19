/**
 * POST /api/ai/identity
 *
 * Mints a signed anonymous identity cookie for the visitor. The client
 * generates a raw UUID, POSTs it here, and we return it as a signed,
 * httpOnly cookie that the server can later verify.
 *
 * This gives the chat / memory endpoints a stable per-visitor id without
 * requiring the visitor to sign in.
 */

import { signAnonId } from "@/lib/ai/memory/anon"
import { ANON_COOKIE } from "@/lib/ai/memory/cookies"
import { assertCsrfOr403 } from "@/lib/security/csrf"
import { NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

const bodySchema = z.object({
  anonId: z.string().uuid("anonId must be a valid UUID"),
})

export async function POST(request: Request): Promise<NextResponse> {
  const csrf = assertCsrfOr403(request, { allowDevHosts: process.env.NODE_ENV !== "production" })
  if (csrf) return csrf

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const signed = signAnonId(body.anonId)
  if (!signed) {
    // No server secret configured — return the raw id and let the client
    // fall back to an unsigned cookie (still works server-side, just not
    // tamper-resistant).
    return NextResponse.json({ ok: true, signed: false })
  }

  const res = NextResponse.json({ ok: true, signed: true })
  res.cookies.set({
    name: ANON_COOKIE,
    value: signed,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    httpOnly: true, // Server-only — the client caches the raw id in localStorage.
    secure: process.env.NODE_ENV === "production",
  })
  return res
}
