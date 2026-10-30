import {
  forumCategories,
  forumModerationEvents,
  forumModerationJobs,
  forumPosts,
  forumReactions,
  forumReports,
  forumThreads,
  notificationPreferences,
  notifications,
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
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm"
import { cache } from "react"
import { getCurrentMember, requireMember } from "./auth"
import { requireRole } from "./auth"
import { CATEGORY_SEEDS } from "./categories"
import { type GuardResult, checkText, normalizeTitle, slugifyTitle } from "./guard"
import { moderateAsync, persistModerationEvent } from "./moderation"
import { setPostPublication } from "./publication"
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
  locale?: string
}

export async function createThread(
  input: CreateThreadInput,
): Promise<
  | { ok: true; threadId: string; slug: string; status: "pending" }
  | { ok: false; reason: string; ruleCodes: string[] }
> {
  const member = await requireMember()
  const category = await getCategoryBySlug(input.categorySlug)
  if (!category) return { ok: false, reason: "Category not found.", ruleCodes: [] }
  if (category.isLocked) return { ok: false, reason: "Category is locked.", ruleCodes: [] }

  if (category.slug === "announcements" && member.role !== "admin" && member.role !== "moderator")
    return { ok: false, reason: "Staff permission required.", ruleCodes: ["staff_only"] }
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
      locale: input.locale === "fi" ? "fi" : "en",
      originalPostId: postId,
      status: "pending",
    })
    await tx.insert(forumPosts).values({
      id: postId,
      threadId,
      authorId: member.id,
      body: input.body.trim(),
      status: "pending",
    })
    await tx.insert(forumModerationJobs).values({ postId })
    await tx.insert(forumModerationEvents).values({
      targetType: "post",
      targetId: postId,
      layer: "lexical",
      verdict: "warn",
      ruleCodes: guard.ruleCodes.length ? guard.ruleCodes : ["pending_review"],
      note: guard.note || "Awaiting publication review.",
      actorId: member.id,
    })
    await tx
      .update(forumThreads)
      .set({ replyCount: 0, lastActivityAt: new Date() })
      .where(eq(forumThreads.id, threadId))
  })

  moderateAsync({ postId, body: input.body, lexical: guard })
  return { ok: true, threadId, slug, status: "pending" }
}

export async function listThreads(
  opts: {
    categorySlug?: string
    categoryId?: string
    limit?: number
    offset?: number
    query?: string
    locale?: string
    unanswered?: boolean
  } = {},
) {
  const limit = Math.min(opts.limit ?? 20, 50)
  const offset = opts.offset ?? 0
  const whereParts = [eq(forumThreads.status, "active")]
  if (opts.locale) whereParts.push(eq(forumThreads.locale, opts.locale))
  if (opts.unanswered) whereParts.push(eq(forumThreads.replyCount, 0))
  if (opts.query?.trim()) {
    const escaped = opts.query
      .trim()
      .slice(0, 200)
      .replace(/[\\%_]/g, "\\$&")
    whereParts.push(
      or(
        ilike(forumThreads.title, `%${escaped}%`),
        sql`exists(select 1 from ${forumPosts} p where p.thread_id=${forumThreads.id} and p.status in ('active','edited') and p.body ilike ${`%${escaped}%`})`,
      ) ?? sql`false`,
    )
  }
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
      locale: forumThreads.locale,
      originalPostId: forumThreads.originalPostId,
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
      locale: forumThreads.locale,
      originalPostId: forumThreads.originalPostId,
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
): Promise<
  | { ok: true; postId: string; status: "pending" }
  | { ok: false; reason: string; ruleCodes: string[] }
> {
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
      status: "pending",
      parentPostId: input.parentPostId ?? null,
    })
    await tx.insert(forumModerationJobs).values({ postId })
    await tx.insert(forumModerationEvents).values({
      targetType: "post",
      targetId: postId,
      layer: "lexical",
      verdict: "warn",
      ruleCodes: guard.ruleCodes.length ? guard.ruleCodes : ["pending_review"],
      note: guard.note || "Awaiting publication review.",
      actorId: member.id,
    })
    await tx
      .update(forumThreads)
      .set({ lastActivityAt: new Date() })
      .where(eq(forumThreads.id, thread.id))
  })

  moderateAsync({ postId, body: input.body, lexical: guard })
  // Tell the thread's author that somebody replied. A reply previously
  // notified nobody: the `reply` kind existed and was never emitted.
  if (thread.authorId && thread.authorId !== member.id) {
    const { emitNotification } = await import("@/lib/notifications")
    emitNotification({
      userId: thread.authorId,
      kind: "reply",
      actorId: member.id,
      actorName: member.name ?? null,
      targetType: "thread",
      targetId: thread.id,
      targetSlug: thread.slug,
      targetTitle: thread.title,
      preview: input.body.trim().slice(0, 240),
    })
  }
  return { ok: true, postId, status: "pending" }
}

export async function listPostsForThread(
  threadSlug: string,
  knownThreadId?: string,
  viewerId?: string,
  role?: string,
) {
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
    .where(
      and(
        eq(forumPosts.threadId, threadId),
        or(
          inArray(forumPosts.status, ["active", "edited"]),
          viewerId
            ? and(
                eq(forumPosts.status, "pending"),
                ["admin", "moderator"].includes(role ?? "")
                  ? sql`true`
                  : eq(forumPosts.authorId, viewerId),
              )
            : sql`false`,
        ),
      ),
    )
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
    .where(
      and(
        eq(forumPosts.id, postId),
        inArray(forumPosts.status, ["active", "edited"]),
        sql`exists(select 1 from forum_threads t where t.id=${forumPosts.threadId} and t.status in ('active','locked'))`,
      ),
    )
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
  const queue = db
    .selectDistinctOn([forumModerationEvents.targetType, forumModerationEvents.targetId], {
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
        sql`not exists (select 1 from forum_moderation_events h where h.target_type=${forumModerationEvents.targetType} and h.target_id=${forumModerationEvents.targetId} and h.layer='human' and h.created_at>=${forumModerationEvents.createdAt})`,
      ),
    )
    .orderBy(
      forumModerationEvents.targetType,
      forumModerationEvents.targetId,
      desc(forumModerationEvents.createdAt),
    )
    .as("pending_review_queue")
  return db.select().from(queue).orderBy(desc(queue.createdAt)).limit(limit)
}

export async function moderatorVerdict(input: {
  eventId: string
  action: "allow" | "keep" | "remove"
  actorId: string
}) {
  await requireRole(["admin", "moderator"])
  await db.transaction(async (tx) => {
    const [evt] = await tx
      .select()
      .from(forumModerationEvents)
      .where(eq(forumModerationEvents.id, input.eventId))
      .for("update")
    if (!evt) throw new Error("event_not_found")
    let postId = evt.targetId
    if (evt.targetType === "thread") {
      const [thread] = await tx.select().from(forumThreads).where(eq(forumThreads.id, evt.targetId))
      postId = thread?.originalPostId ?? ""
    }
    await tx
      .update(forumModerationJobs)
      .set({ status: "done", lockedAt: null })
      .where(eq(forumModerationJobs.postId, postId))
    const changed = await setPostPublication(tx, postId, input.action !== "remove")
    await tx.insert(forumModerationEvents).values({
      targetType: evt.targetType,
      targetId: evt.targetId,
      layer: "human",
      verdict: input.action === "remove" ? "remove" : "allow",
      ruleCodes: [],
      note: "Publication decision recorded.",
      actorId: input.actorId,
    })
    if (changed.changed) {
      const notify = async (userId: string, kind: string) => {
        if (userId === input.actorId) return
        const [prefs] = await tx
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.userId, userId))
        if (prefs?.replyEnabled === false) return
        await tx.insert(notifications).values({
          userId,
          kind,
          actorId: input.actorId,
          targetType: "thread",
          targetId: changed.thread.id,
          targetSlug: changed.thread.slug,
          targetTitle: changed.thread.title,
        })
      }
      if (changed.post.authorId)
        await notify(
          changed.post.authorId,
          input.action === "remove" ? "moderation_removed" : "moderation_approved",
        )
      if (
        !changed.original &&
        input.action !== "remove" &&
        changed.thread.authorId &&
        changed.thread.authorId !== changed.post.authorId
      )
        await notify(changed.thread.authorId, "reply")
    }
    return changed
  })
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
    await db.transaction(async (tx) => {
      await tx
        .update(forumModerationJobs)
        .set({ status: "done", lockedAt: null })
        .where(eq(forumModerationJobs.postId, report.postId))
      await setPostPublication(tx, report.postId, false)
    })
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

export async function categoryThreadCounts() {
  const rows = await db
    .select({ categoryId: forumThreads.categoryId, count: sql<number>`count(*)::integer` })
    .from(forumThreads)
    .where(eq(forumThreads.status, "active"))
    .groupBy(forumThreads.categoryId)
  return new Map(rows.map((r) => [r.categoryId, r.count]))
}
