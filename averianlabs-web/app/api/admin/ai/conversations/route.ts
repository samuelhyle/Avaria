/**
 * GET /api/admin/ai/conversations — admin transcript search.
 *
 * Lists conversations matching an optional free-text query (matches title,
 * email, or conversation id). Admin-only — enforced by `auth()` + role check.
 */

import { aiConversations } from "@/db/schema/ai"
import { getAdminOrNull } from "@/lib/admin/guard"
import { db } from "@/lib/db"
import { and, desc, eq, ilike, or } from "drizzle-orm"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request): Promise<NextResponse> {
  // DB-backed role check (JWT role claims can be stale after demotion).
  const admin = await getAdminOrNull()
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const q = url.searchParams.get("q")?.trim() ?? ""
  const rawLimit = Number(url.searchParams.get("limit") ?? 50)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 200) : 50
  const locale = url.searchParams.get("locale") ?? undefined

  const filters = []
  if (locale) filters.push(eq(aiConversations.locale, locale))
  if (q.length > 0) {
    const needle = `%${q}%`
    filters.push(
      or(
        ilike(aiConversations.title, needle),
        ilike(aiConversations.anonymousId, needle),
        ilike(aiConversations.id, needle),
      ),
    )
  }

  const rows = await db
    .select()
    .from(aiConversations)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(aiConversations.lastMessageAt))
    .limit(limit)

  return NextResponse.json({
    conversations: rows
      .filter((r) => !r.deletedAt)
      .map((r) => ({
        id: r.id,
        title: r.title,
        locale: r.locale,
        optedIn: r.optedIn,
        userId: r.userId,
        anonymousId: r.anonymousId,
        contextKind: r.contextKind,
        contextPath: r.contextPath,
        lastMessageAt: r.lastMessageAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
  })
}
