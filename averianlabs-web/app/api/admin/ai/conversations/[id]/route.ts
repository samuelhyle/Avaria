/**
 * GET /api/admin/ai/conversations/[id] — full transcript + metadata.
 *
 * Admin-only. Returns the conversation row + every message in chronological
 * order, with metadata (tool trace, citations, proposed actions) for the
 * copilot to render or summarize.
 */

import { aiConversations, aiMessages } from "@/db/schema/ai"
import { getAdminOrNull } from "@/lib/admin/guard"
import { db } from "@/lib/db"
import { asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // DB-backed role check (JWT role claims can be stale after demotion).
  const admin = await getAdminOrNull()
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await ctx.params

  const convRows = await db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.id, id))
    .limit(1)
  const conversation = convRows[0]
  if (!conversation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const messages = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, id))
    .orderBy(asc(aiMessages.createdAt))

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      locale: conversation.locale,
      optedIn: conversation.optedIn,
      userId: conversation.userId,
      anonymousId: conversation.anonymousId,
      contextKind: conversation.contextKind,
      contextPath: conversation.contextPath,
      createdAt: conversation.createdAt.toISOString(),
      lastMessageAt: conversation.lastMessageAt.toISOString(),
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      tokensIn: m.tokensIn,
      tokensOut: m.tokensOut,
      latencyMs: m.latencyMs,
      feedback: m.feedback,
      createdAt: m.createdAt.toISOString(),
    })),
  })
}
