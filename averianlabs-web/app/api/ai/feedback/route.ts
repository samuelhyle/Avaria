/**
 * POST /api/ai/feedback
 *
 * Persists thumbs up/down feedback on a message. Body: { messageId, feedback: "up" | "down" }
 *
 * The message must belong to a conversation owned by the caller (signed-in
 * user or signed anonymous cookie) — otherwise a malicious client could
 * scribble on another user's messages. We treat ownership mismatches as
 * "not_found" so we don't leak which message ids exist.
 */

import { aiConversations, aiMessages } from "@/db/schema/ai"
import { getAnonFromRequest } from "@/lib/ai/memory/consent"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { assertCsrfOr403 } from "@/lib/security/csrf"
import { clientIp } from "@/lib/security/ip"
import { rateLimit } from "@/lib/security/rate-limit"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

const bodySchema = z.object({
  messageId: z.string().min(1).max(128),
  feedback: z.enum(["up", "down"]),
})

export async function POST(request: Request): Promise<NextResponse> {
  const csrf = assertCsrfOr403(request, { allowDevHosts: process.env.NODE_ENV !== "production" })
  if (csrf) return csrf

  const limit = await rateLimit(`ai:feedback:${clientIp(request)}`, {
    limit: 30,
    window: "1 m",
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

  const owner = await resolveOwner(request)
  if (!owner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const ownerFilter =
    owner.kind === "user"
      ? eq(aiConversations.userId, owner.userId)
      : eq(aiConversations.anonymousId, owner.anonymousId)

  // Verify the message exists *and* belongs to a conversation the caller
  // owns. Treat ownership mismatches as 404 so we don't leak which ids
  // exist in other users' conversations.
  const msg = await db
    .select({ id: aiMessages.id })
    .from(aiMessages)
    .innerJoin(aiConversations, eq(aiConversations.id, aiMessages.conversationId))
    .where(and(eq(aiMessages.id, body.messageId), ownerFilter))
    .limit(1)
  if (!msg[0]) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  await db
    .update(aiMessages)
    .set({ feedback: body.feedback })
    .where(eq(aiMessages.id, body.messageId))

  return NextResponse.json({ ok: true, messageId: body.messageId, feedback: body.feedback })
}

async function resolveOwner(
  request: Request,
): Promise<{ kind: "user"; userId: string } | { kind: "anonymous"; anonymousId: string } | null> {
  const session = await auth().catch(() => null)
  const userId = (session?.user as { id?: string } | null | undefined)?.id ?? null
  if (userId) return { kind: "user", userId }
  const anonId = getAnonFromRequest(request)
  if (anonId) return { kind: "anonymous", anonymousId: anonId }
  return null
}
