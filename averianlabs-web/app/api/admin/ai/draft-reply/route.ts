/**
 * POST /api/admin/ai/draft-reply
 *
 * Admin-only. Generates a draft reply for a support ticket via the
 * `adminDraftReply` tool. Mirrors the tool's input shape so the client can
 * pass through whatever it has in its UI state.
 */

import { getAdminOrNull } from "@/lib/admin/guard"
import { runTool } from "@/lib/ai/tools/registry"
import { logger } from "@/lib/logger"
import { assertCsrfOr403 } from "@/lib/security/csrf"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

export const runtime = "nodejs"
export const maxDuration = 30

const bodySchema = z.object({
  ticketId: z.string().min(1).max(64),
  email: z.string().email().or(z.literal("")).optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(20)
    .optional(),
  tone: z.enum(["warm", "concise", "technical"]).optional(),
  locale: z.enum(["en", "fi", "de", "sv", "nl"]),
})

export async function POST(request: Request): Promise<NextResponse> {
  const csrf = assertCsrfOr403(request, { allowDevHosts: process.env.NODE_ENV !== "production" })
  if (csrf) return csrf

  // DB-backed role check (JWT role claims can be stale after demotion).
  const admin = await getAdminOrNull()
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // LLM spend guard.
  const limit = await rateLimit(`admin:draft-reply:${admin.id}`, {
    limit: 20,
    window: "1 h",
    failMode: "closed",
  })
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  try {
    const result = await runTool(
      "adminDraftReply",
      {
        ticketId: body.ticketId,
        email: body.email ?? "support@averianlabs.eu",
        subject: body.subject,
        body: body.body,
        transcript: body.transcript ?? [],
        tone: body.tone,
      },
      {
        locale: body.locale,
        cart: [],
        isAdmin: true,
        auth: {
          userId: admin.id,
          email: admin.email,
          role: admin.role,
        },
      },
    )
    return NextResponse.json(result.content)
  } catch (err) {
    logger.error("[averia] admin draft-reply failed", err)
    return NextResponse.json({ error: "draft_failed" }, { status: 502 })
  }
}
