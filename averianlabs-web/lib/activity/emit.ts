import { activityEvents, forumPosts, forumThreads, researchPlans } from "@/db/schema"
/**
 * Activity event emitter — append-only public-safe log.
 *
 * Each event kind has a strict payload whitelist; the feed widget reads
 * from this table and the home page poll endpoint streams from it.
 *
 * Per the migration plan, this powers the home-page activity feed.
 */
import { db } from "@/lib/db"

export type ActivityKind =
  | "thread_created"
  | "post_created"
  | "reaction_added"
  | "batch_status_changed"
  | "product_status_published"
  | "research_note_published"
  | "plan_shared"

export const VALID_KINDS: ReadonlySet<ActivityKind> = new Set([
  "thread_created",
  "post_created",
  "reaction_added",
  "batch_status_changed",
  "product_status_published",
  "research_note_published",
  "plan_shared",
])

export interface EmitInput {
  kind: ActivityKind
  actorId?: string | null
  actorName?: string | null
  targetType?: string | null
  targetId?: string | null
  targetSlug?: string | null
  targetTitle?: string | null
}

/**
 * Fire-and-forget. Never throws. Best-effort.
 */
export function emitActivity(input: EmitInput): void {
  if (!VALID_KINDS.has(input.kind)) return
  void (async () => {
    try {
      await db.insert(activityEvents).values({
        id: crypto.randomUUID(),
        kind: input.kind,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        targetSlug: input.targetSlug ?? null,
        targetTitle: input.targetTitle ?? null,
      })
    } catch {
      // best-effort; never crash the request path
    }
  })().catch(() => {})
}

export async function recentActivity(limit = 12) {
  const { and, desc, eq, getTableColumns, ne, or, sql } = await import("drizzle-orm")
  return db
    .select(getTableColumns(activityEvents))
    .from(activityEvents)
    .leftJoin(
      researchPlans,
      and(eq(activityEvents.targetType, "plan"), eq(activityEvents.targetId, researchPlans.id)),
    )
    .leftJoin(
      forumThreads,
      and(eq(activityEvents.targetType, "thread"), eq(activityEvents.targetId, forumThreads.id)),
    )
    .leftJoin(
      forumPosts,
      and(eq(activityEvents.targetType, "post"), eq(activityEvents.targetId, forumPosts.id)),
    )
    .where(
      and(
        sql`(${activityEvents.kind} not in ('thread_created','post_created','reaction_added') or (${activityEvents.targetType}='thread' and ${forumThreads.status} in ('active','locked') and ${activityEvents.kind}<>'post_created') or (${activityEvents.targetType}='post' and ${forumPosts.status} in ('active','edited') and exists(select 1 from forum_threads ft where ft.id=${forumPosts.threadId} and ft.status in ('active','locked'))))`,
        or(
          ne(activityEvents.kind, "plan_shared"),
          and(
            eq(researchPlans.isPublic, true),
            eq(researchPlans.shareSlug, activityEvents.targetSlug),
          ),
        ),
      ),
    )
    .orderBy(desc(activityEvents.createdAt))
    .limit(Math.min(limit, 50))
}
