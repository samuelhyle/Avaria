import {
  forumCategories,
  forumModerationEvents,
  forumPosts,
  forumReactions,
  forumReports,
  forumThreads,
  users,
} from "@/db/schema"
import { emitActivity } from "@/lib/activity/emit"
import { db } from "@/lib/db"
/**
 * Community service — single entry point for forum reads + writes.
 *
 * Ported from helix-labs-store v1's `lib/forum/service.ts` with v2
 * conventions (Auth.js session, Drizzle upserts, async LLM moderator).
 */
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm"
import { cache } from "react"
import { getCurrentMember, requireMember } from "./auth"
import { CATEGORY_SEEDS } from "./categories"
import { type GuardResult, checkText, normalizeTitle, slugifyTitle } from "./guard"
import { moderateAsync, persistModerationEvent } from "./moderation"
import { tierFor } from "./reputation"

/* ─── categories ─── */

let categoriesEnsured: Promise<void> | null = null

async function seedCategories(): Promise<void> {
  const existing = await db.select({ slug: forumCategories.slug }).from(forumCategories)
  const existingSlugs = new Set(existing.map((r) => r.slug))
  for (const seed of CATEGORY_SEEDS) {
    if (existingSlugs.has(seed.slug)) continue
    await db
      .insert(forumCategories)
      .values({
        slug: seed.slug,
        nameKey: seed.nameKey,
        descriptionKey: seed.descriptionKey,
        sortOrder: seed.sortOrder,
      })
      .onConflictDoNothing()
  }
}

/**
 * Seeds forum categories once per server process. Previously this ran on every
 * read (two extra queries per category list) and could write on GET requests.
 */
export function ensureCategories(): Promise<void> {
  if (!categoriesEnsured) {
    categoriesEnsured = seedCategories().catch((err) => {
      categoriesEnsured = null
      throw err
    })
  }
  return categoriesEnsured
}

export async function listCategories() {
  await ensureCategories()
  return db.select().from(forumCategories).orderBy(forumCategories.sortOrder)
}

export async function getCategoryBySlug(slug: string) {
  const rows = await db
    .select()
    .from(forumCategories)
    .where(eq(forumCategories.slug, slug))
    .limit(1)
  return rows[0] ?? null
}

/* ─── threads ─── */

export interface CreateThreadInput {
  categorySlug: string
  title: string
  body: string
}

export async function createThread(
  input: CreateThreadInput,
): Promise<
  { ok: true; threadId: string; slug: string } | { ok: false; reason: string; ruleCodes: string[] }
> {
  const member = await requireMember()
  const category = await getCategoryBySlug(input.categorySlug)
  if (!category) return { ok: false, reason: "Category not found.", ruleCodes: [] }
  if (category.isLocked) return { ok: false, reason: "Category is locked.", ruleCodes: [] }

  const title = normalizeTitle(input.title)
  if (title.length < 6) {
    return {
      ok: false,
      reason: "Title must be at least 6 characters.",
      ruleCodes: ["title_too_short"],
    }
  }

  const guard = checkText(input.body)
  if (guard.verdict === "block") {
    await persistModerationEvent({
      targetType: "post",
      targetId: "blocked",
      layer: "lexical",
      verdict: "remove",
      ruleCodes: guard.ruleCodes,
      note: guard.note,
      actorId: member.id,
    })
    return { ok: false, reason: guard.note, ruleCodes: guard.ruleCodes }
  }

  const slug = slugifyTitle(title)
  const threadId = crypto.randomUUID()
  const postId = crypto.randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(forumThreads).values({
      id: threadId,
      categoryId: category.id,
      authorId: member.id,
      slug,
      title,
      status: "active",
    })
    await tx.insert(forumPosts).values({
      id: postId,
      threadId,
      authorId: member.id,
      body: input.body.trim(),
      status: "active",
    })
    await tx
      .update(forumThreads)
      .set({ replyCount: 1, lastActivityAt: new Date() })
      .where(eq(forumThreads.id, threadId))
  })

  await persistModerationEvent({
    targetType: "thread",
    targetId: threadId,
    layer: "lexical",
    verdict: guard.verdict === "warn" ? "warn" : "allow",
    ruleCodes: guard.ruleCodes,
    note: guard.note,
    actorId: member.id,
  })

  moderateAsync({ postId, body: input.body, lexical: guard })

  emitActivity({
    kind: "thread_created",
    actorId: member.id,
    actorName: member.name,
    targetType: "thread",
    targetId: threadId,
    targetSlug: slug,
    targetTitle: title,
  })

  return { ok: true, threadId, slug }
}

export async function listThreads(
  opts: { categorySlug?: string; categoryId?: string; limit?: number; offset?: number } = {},
) {
  const limit = Math.min(opts.limit ?? 20, 50)
  const offset = opts.offset ?? 0
  const whereParts = [eq(forumThreads.status, "active")]
  if (opts.categoryId) {
    whereParts.push(eq(forumThreads.categoryId, opts.categoryId))
  } else if (opts.categorySlug) {
    const cat = await getCategoryBySlug(opts.categorySlug)
    if (!cat) return []
    whereParts.push(eq(forumThreads.categoryId, cat.id))
  }
  return db
    .select({
      id: forumThreads.id,
      slug: forumThreads.slug,
      title: forumThreads.title,
      status: forumThreads.status,
      viewCount: forumThreads.viewCount,
      replyCount: forumThreads.replyCount,
      lastActivityAt: forumThreads.lastActivityAt,
      createdAt: forumThreads.createdAt,
      categorySlug: forumCategories.slug,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image,
      authorReputation: users.reputation,
    })
    .from(forumThreads)
    .leftJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
    .leftJoin(users, eq(forumThreads.authorId, users.id))
    .where(and(...whereParts))
    .orderBy(desc(forumThreads.lastActivityAt))
    .limit(limit)
    .offset(offset)
}

export const getThreadBySlug = cache(async (slug: string) => {
  const rows = await db
    .select({
      id: forumThreads.id,
      slug: forumThreads.slug,
      title: forumThreads.title,
      status: forumThreads.status,
      viewCount: forumThreads.viewCount,
      replyCount: forumThreads.replyCount,
      lastActivityAt: forumThreads.lastActivityAt,
      createdAt: forumThreads.createdAt,
      categoryId: forumThreads.categoryId,
      categorySlug: forumCategories.slug,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image,
      authorReputation: users.reputation,
    })
    .from(forumThreads)
    .leftJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
    .leftJoin(users, eq(forumThreads.authorId, users.id))
    .where(eq(forumThreads.slug, slug))
    .limit(1)
  return rows[0] ?? null
})

export async function incrementViewCount(threadId: string): Promise<void> {
  await db
    .update(forumThreads)
    .set({ viewCount: sql`${forumThreads.viewCount} + 1` })
    .where(eq(forumThreads.id, threadId))
}

/* ─── posts (replies) ─── */

export interface CreatePostInput {
  threadSlug: string
  body: string
  parentPostId?: string
}

export async function createReply(
  input: CreatePostInput,
): Promise<{ ok: true; postId: string } | { ok: false; reason: string; ruleCodes: string[] }> {
  const member = await requireMember()
  const thread = await getThreadBySlug(input.threadSlug)
  if (!thread) return { ok: false, reason: "Thread not found.", ruleCodes: [] }
  if (thread.status !== "active")
    return { ok: false, reason: "Thread is locked or removed.", ruleCodes: [] }

  const guard = checkText(input.body)
  if (guard.verdict === "block") {
    await persistModerationEvent({
      targetType: "post",
      targetId: "blocked",
      layer: "lexical",
      verdict: "remove",
      ruleCodes: guard.ruleCodes,
      note: guard.note,
      actorId: member.id,
    })
    return { ok: false, reason: guard.note, ruleCodes: guard.ruleCodes }
  }

  const postId = crypto.randomUUID()
  await db.transaction(async (tx) => {
    await tx.insert(forumPosts).values({
      id: postId,
      threadId: thread.id,
      authorId: member.id,
      body: input.body.trim(),
      status: "active",
      parentPostId: input.parentPostId ?? null,
    })
    await tx
      .update(forumThreads)
      .set({ replyCount: sql`${forumThreads.replyCount} + 1`, lastActivityAt: new Date() })
      .where(eq(forumThreads.id, thread.id))
  })

  await persistModerationEvent({
    targetType: "post",
    targetId: postId,
    layer: "lexical",
    verdict: guard.verdict === "warn" ? "warn" : "allow",
    ruleCodes: guard.ruleCodes,
    note: guard.note,
    actorId: member.id,
  })

  moderateAsync({ postId, body: input.body, lexical: guard })

  emitActivity({
    kind: "post_created",
    actorId: member.id,
    actorName: member.name,
    targetType: "thread",
    targetId: thread.id,
    targetSlug: thread.slug,
    targetTitle: thread.title,
  })

  // Notify the original poster (if it's a different person).
  if (thread.authorId && thread.authorId !== member.id) {
    const { emitNotification } = await import("@/lib/notifications")
    emitNotification({
      userId: thread.authorId,
      kind: "reply",
      actorId: member.id,
      actorName: member.name,
      targetType: "thread",
      targetId: thread.id,
      targetSlug: thread.slug,
      targetTitle: thread.title,
      preview: input.body.slice(0, 160),
    })
  }

  return { ok: true, postId }
}

export async function listPostsForThread(threadSlug: string, knownThreadId?: string) {
  let threadId = knownThreadId
  if (!threadId) {
    const thread = await getThreadBySlug(threadSlug)
    if (!thread) return []
    threadId = thread.id
  }
  return db
    .select({
      id: forumPosts.id,
      body: forumPosts.body,
      status: forumPosts.status,
      createdAt: forumPosts.createdAt,
      editedAt: forumPosts.editedAt,
      parentPostId: forumPosts.parentPostId,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image,
      authorReputation: users.reputation,
    })
    .from(forumPosts)
    .leftJoin(users, eq(forumPosts.authorId, users.id))
    .where(and(eq(forumPosts.threadId, threadId), inArray(forumPosts.status, ["active", "edited"])))
    .orderBy(forumPosts.createdAt)
}

export async function getPostById(postId: string) {
  const rows = await db
    .select({
      id: forumPosts.id,
      body: forumPosts.body,
      status: forumPosts.status,
      createdAt: forumPosts.createdAt,
      threadId: forumPosts.threadId,
      authorId: users.id,
      authorName: users.name,
    })
    .from(forumPosts)
    .leftJoin(users, eq(forumPosts.authorId, users.id))
    .where(eq(forumPosts.id, postId))
    .limit(1)
  return rows[0] ?? null
}

/* ─── reactions ─── */

export type ReactionKind = "helpful" | "insightful" | "thanks"
const REACTION_KINDS: readonly ReactionKind[] = ["helpful", "insightful", "thanks"]

export async function toggleReaction(
  postId: string,
  kind: ReactionKind,
): Promise<{ active: boolean; count: number }> {
  const member = await requireMember()
  if (!REACTION_KINDS.includes(kind)) throw new Error("Invalid reaction kind.")

  const post = await db
    .select({ authorId: forumPosts.authorId })
    .from(forumPosts)
    .where(eq(forumPosts.id, postId))
    .limit(1)
  if (!post[0]) throw new Error("Post not found.")
  if (post[0].authorId === member.id) throw new Error("You cannot react to your own post.")

  const existing = await db
    .select()
    .from(forumReactions)
    .where(
      and(
        eq(forumReactions.postId, postId),
        eq(forumReactions.userId, member.id),
        eq(forumReactions.kind, kind),
      ),
    )
    .limit(1)

  if (existing[0]) {
    await db.delete(forumReactions).where(eq(forumReactions.id, existing[0].id))
    if (post[0].authorId) await adjustReputation(post[0].authorId, -1)
    // (no notification on reaction removal — keeps the inbox quiet)
  } else {
    await db.insert(forumReactions).values({ postId, userId: member.id, kind })
    if (post[0].authorId) {
      await adjustReputation(post[0].authorId, 1)
      // Notify the post's author.
      const { emitNotification } = await import("@/lib/notifications")
      emitNotification({
        userId: post[0].authorId,
        kind: "reaction",
        actorId: member.id,
        actorName: member.name,
        targetType: "post",
        targetId: postId,
        preview: `${kind} reaction`,
      })
    }
  }

  const countRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(forumReactions)
    .where(and(eq(forumReactions.postId, postId), eq(forumReactions.kind, kind)))
  return { active: !existing[0], count: countRows[0]?.c ?? 0 }
}

export async function getReactionsForPosts(
  postIds: string[],
  knownMember?: Awaited<ReturnType<typeof getCurrentMember>>,
) {
  if (postIds.length === 0) {
    return new Map<
      string,
      {
        helpful: number
        insightful: number
        thanks: number
        mine: { helpful: boolean; insightful: boolean; thanks: boolean }
      }
    >()
  }
  const me = knownMember !== undefined ? knownMember : await getCurrentMember()

  const rows = await db
    .select({
      postId: forumReactions.postId,
      kind: forumReactions.kind,
      userId: forumReactions.userId,
    })
    .from(forumReactions)
    .where(inArray(forumReactions.postId, postIds))

  const out = new Map<
    string,
    {
      helpful: number
      insightful: number
      thanks: number
      mine: { helpful: boolean; insightful: boolean; thanks: boolean }
    }
  >()
  for (const id of postIds) {
    out.set(id, {
      helpful: 0,
      insightful: 0,
      thanks: 0,
      mine: { helpful: false, insightful: false, thanks: false },
    })
  }
  for (const r of rows) {
    const entry = out.get(r.postId)
    if (!entry) continue
    if (r.kind === "helpful") entry.helpful++
    if (r.kind === "insightful") entry.insightful++
    if (r.kind === "thanks") entry.thanks++
    if (me && r.userId === me.id) {
      if (r.kind === "helpful") entry.mine.helpful = true
      if (r.kind === "insightful") entry.mine.insightful = true
      if (r.kind === "thanks") entry.mine.thanks = true
    }
  }
  return out
}

async function adjustReputation(userId: string, delta: number) {
  // Atomic increment — no read-modify-write race between concurrent reactions.
  const [updated] = await db
    .update(users)
    .set({ reputation: sql`GREATEST(0, ${users.reputation} + ${delta})` })
    .where(eq(users.id, userId))
    .returning({ reputation: users.reputation })
  if (!updated) return
  const tier = tierFor(updated.reputation)
  await db.update(users).set({ reputationTier: tier.id }).where(eq(users.id, userId))
}

/* ─── reports ─── */

export async function reportPost(input: { postId: string; reason: string; detail?: string }) {
  const member = await requireMember()
  if (input.reason.length < 3 || input.reason.length > 200) {
    return { ok: false as const, reason: "Reason must be 3–200 characters." }
  }
  if (input.detail && input.detail.length > 1000) {
    return { ok: false as const, reason: "Detail must be ≤1000 characters." }
  }
  await db.insert(forumReports).values({
    postId: input.postId,
    reporterId: member.id,
    reason: input.reason,
    detail: input.detail ?? null,
  })
  return { ok: true as const }
}

/* ─── leaderboard ─── */

export async function topMembers(limit = 5) {
  return db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      reputation: users.reputation,
      reputationTier: users.reputationTier,
    })
    .from(users)
    .orderBy(desc(users.reputation))
    .limit(limit)
}

/* ─── moderation queue (human layer) ─── */

export async function moderationQueue(limit = 50) {
  return db
    .select({
      id: forumModerationEvents.id,
      targetType: forumModerationEvents.targetType,
      targetId: forumModerationEvents.targetId,
      layer: forumModerationEvents.layer,
      verdict: forumModerationEvents.verdict,
      ruleCodes: forumModerationEvents.ruleCodes,
      note: forumModerationEvents.note,
      createdAt: forumModerationEvents.createdAt,
    })
    .from(forumModerationEvents)
    .where(
      and(
        inArray(forumModerationEvents.verdict, ["warn", "remove"]),
        // Human verdicts are terminal — they must leave the queue.
        ne(forumModerationEvents.layer, "human"),
        // Content blocked before publish is audit-only, not actionable.
        ne(forumModerationEvents.targetId, "blocked"),
      ),
    )
    .orderBy(desc(forumModerationEvents.createdAt))
    .limit(limit)
}

export async function moderatorVerdict(input: {
  eventId: string
  action: "allow" | "keep" | "remove"
  actorId: string
}) {
  const targetVerdict =
    input.action === "allow" ? "allow" : input.action === "remove" ? "remove" : "warn"
  await db
    .update(forumModerationEvents)
    .set({ verdict: targetVerdict, actorId: input.actorId, layer: "human" })
    .where(eq(forumModerationEvents.id, input.eventId))

  if (input.action === "remove") {
    // Best-effort: mark the post as removed. Look up the event's target_id first.
    const [evt] = await db
      .select({
        targetType: forumModerationEvents.targetType,
        targetId: forumModerationEvents.targetId,
      })
      .from(forumModerationEvents)
      .where(eq(forumModerationEvents.id, input.eventId))
      .limit(1)
    if (evt?.targetType === "post") {
      await db.update(forumPosts).set({ status: "removed" }).where(eq(forumPosts.id, evt.targetId))
    }
  }
}

/* ─── reports (human queue) ─── */

export async function listOpenReports(limit = 50) {
  return db
    .select({
      id: forumReports.id,
      postId: forumReports.postId,
      reason: forumReports.reason,
      detail: forumReports.detail,
      createdAt: forumReports.createdAt,
    })
    .from(forumReports)
    .where(eq(forumReports.status, "open"))
    .orderBy(desc(forumReports.createdAt))
    .limit(limit)
}

export async function resolveReport(input: {
  reportId: string
  action: "dismiss" | "remove"
  actorId: string
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [report] = await db
    .select({ postId: forumReports.postId })
    .from(forumReports)
    .where(eq(forumReports.id, input.reportId))
    .limit(1)
  if (!report) return { ok: false, reason: "Report not found." }

  if (input.action === "remove") {
    await db.update(forumPosts).set({ status: "removed" }).where(eq(forumPosts.id, report.postId))
    await db
      .update(forumReports)
      .set({ status: "reviewed" })
      .where(eq(forumReports.id, input.reportId))
  } else {
    await db
      .update(forumReports)
      .set({ status: "dismissed" })
      .where(eq(forumReports.id, input.reportId))
  }
  return { ok: true }
}
