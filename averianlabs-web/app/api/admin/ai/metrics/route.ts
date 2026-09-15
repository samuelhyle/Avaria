/**
 * GET /api/admin/ai/metrics
 *
 * Usage + quality metrics for Averia: conversation/message totals, feedback
 * ratio, average latency, token usage, and memory counts. Admin-only.
 */

import { aiConversations, aiMessages, userMemories } from "@/db/schema/ai"
import { getAdminOrNull } from "@/lib/admin"
import { db } from "@/lib/db"
import { and, eq, gte, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(): Promise<NextResponse> {
  const admin = await getAdminOrNull()
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    [conversationTotals],
    [messageTotals],
    [feedbackTotals],
    [memoryTotals],
    [recentConversations],
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        last7d: sql<number>`count(*) filter (where ${aiConversations.createdAt} >= ${weekAgo})::int`,
      })
      .from(aiConversations),
    db
      .select({
        total: sql<number>`count(*)::int`,
        assistant: sql<number>`count(*) filter (where ${aiMessages.role} = 'assistant')::int`,
        avgLatencyMs: sql<
          number | null
        >`avg(${aiMessages.latencyMs}) filter (where ${aiMessages.latencyMs} is not null)`,
        tokensIn: sql<number>`coalesce(sum(${aiMessages.tokensIn}), 0)::bigint`,
        tokensOut: sql<number>`coalesce(sum(${aiMessages.tokensOut}), 0)::bigint`,
      })
      .from(aiMessages),
    db
      .select({
        up: sql<number>`count(*) filter (where ${aiMessages.feedback} = 'up')::int`,
        down: sql<number>`count(*) filter (where ${aiMessages.feedback} = 'down')::int`,
      })
      .from(aiMessages),
    db.select({ total: sql<number>`count(*)::int` }).from(userMemories),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(aiConversations)
      .where(and(gte(aiConversations.createdAt, weekAgo), eq(aiConversations.optedIn, "accepted"))),
  ])

  const up = feedbackTotals?.up ?? 0
  const down = feedbackTotals?.down ?? 0
  const feedbackTotal = up + down

  return NextResponse.json({
    conversations: {
      total: conversationTotals?.total ?? 0,
      last7d: conversationTotals?.last7d ?? 0,
      optedInLast7d: recentConversations?.total ?? 0,
    },
    messages: {
      total: messageTotals?.total ?? 0,
      assistant: messageTotals?.assistant ?? 0,
      avgLatencyMs: messageTotals?.avgLatencyMs ? Math.round(messageTotals.avgLatencyMs) : null,
      tokensIn: Number(messageTotals?.tokensIn ?? 0),
      tokensOut: Number(messageTotals?.tokensOut ?? 0),
    },
    feedback: {
      up,
      down,
      helpfulRatio: feedbackTotal > 0 ? Number((up / feedbackTotal).toFixed(3)) : null,
    },
    memories: {
      total: memoryTotals?.total ?? 0,
    },
  })
}
