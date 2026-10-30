import { DELETE as deleteCalculation } from "@/app/api/calculations/[id]/route"
import { GET as getHistory, POST as saveCalculation } from "@/app/api/calculations/route"
import { GET as getDraft, PUT as saveDraft } from "@/app/api/forum/drafts/route"
import {
  activityEvents,
  forumDrafts,
  forumModerationEvents,
  forumModerationJobs,
  forumPosts,
  forumThreads,
  notifications,
  savedCalculations,
  users,
} from "@/db/schema"
import { recentActivity } from "@/lib/activity/emit"
import { readDiscussionTool } from "@/lib/ai/tools/community"
import { processModerationJobs } from "@/lib/community/moderation"
import {
  categoryThreadCounts,
  createReply,
  createThread,
  ensureCategories,
  getCategoryBySlug,
  listPostsForThread,
  listThreads,
  moderatorVerdict,
  toggleReaction,
} from "@/lib/community/service"
import { db } from "@/lib/db"
import { exportUserData, softDeleteUser } from "@/lib/gdpr/service"
import { and, eq, inArray } from "drizzle-orm"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
const state = vi.hoisted(() => ({ id: "", role: "member", configured: false, complete: vi.fn() }))
vi.mock("@/lib/community/auth", () => ({
  getCurrentMember: vi.fn(async () =>
    state.id
      ? {
          id: state.id,
          role: state.role,
          name: "QA test member",
          email: "qa@example.invalid",
          reputation: 0,
          tier: "new",
          image: null,
        }
      : null,
  ),
  requireMember: vi.fn(async () => {
    if (!state.id) throw new Error("auth_required")
    return { id: state.id, role: state.role, name: "QA test member" }
  }),
  requireRole: vi.fn(async (roles: string[]) => {
    if (!roles.includes(state.role)) throw new Error("forbidden")
    return { id: state.id, role: state.role }
  }),
}))
vi.mock("@/lib/ai/providers/minimax", () => ({
  isMinimaxConfigured: () => state.configured,
  completeMinimaxChat: state.complete,
}))
const prefix = `workspace-${crypto.randomUUID()}`
const ids = [`${prefix}-owner`, `${prefix}-other`, `${prefix}-moderator`]
async function clean() {
  const threads = await db
    .select({ id: forumThreads.id })
    .from(forumThreads)
    .where(inArray(forumThreads.authorId, ids))
  const threadIds = threads.map((t) => t.id)
  const posts = threadIds.length
    ? await db
        .select({ id: forumPosts.id })
        .from(forumPosts)
        .where(inArray(forumPosts.threadId, threadIds))
    : []
  const targetIds = [...threadIds, ...posts.map((p) => p.id)]
  if (targetIds.length) {
    await db.delete(forumModerationEvents).where(inArray(forumModerationEvents.targetId, targetIds))
    await db.delete(activityEvents).where(inArray(activityEvents.targetId, targetIds))
  }
  if (threadIds.length) await db.delete(forumThreads).where(inArray(forumThreads.id, threadIds))
  await db.delete(savedCalculations).where(inArray(savedCalculations.ownerId, ids))
  await db.delete(forumDrafts).where(inArray(forumDrafts.ownerId, ids))
  await db.delete(notifications).where(inArray(notifications.userId, ids))
}
beforeAll(async () => {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "http://invalid")
  if (
    process.env.TEST_DATABASE_URL !== process.env.DATABASE_URL ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/averian_reliability", "/build"].includes(url.pathname)
  )
    throw new Error("isolated database required")
  await db.insert(users).values(
    ids.map((id, i) => ({
      id,
      email: `${id}@example.invalid`,
      role: i === 2 ? "moderator" : "customer",
      emailVerifiedAt: new Date(),
    })),
  )
  await ensureCategories()
})
afterEach(async () => {
  await clean()
  state.configured = false
  state.complete.mockReset()
  state.id = ids[0] ?? ""
  state.role = "member"
})
afterAll(async () => {
  await clean()
  await db.delete(users).where(inArray(users.id, ids))
})
async function pendingThread() {
  state.id = ids[0] ?? ""
  state.role = "member"
  const result = await createThread({
    categorySlug: "research-discussion",
    locale: "fi",
    title: `QA test question ${prefix}`,
    body: "Laboratory method comparison. See https://doi.org/10.1000/182 for context.",
  })
  if (!result.ok) throw new Error(result.reason)
  return result
}
async function approve(postId: string) {
  state.id = ids[2] ?? ""
  state.role = "moderator"
  const [evt] = await db
    .select()
    .from(forumModerationEvents)
    .where(
      and(eq(forumModerationEvents.targetId, postId), eq(forumModerationEvents.layer, "lexical")),
    )
  if (!evt) throw new Error("no review event")
  await moderatorVerdict({ eventId: evt.id, action: "allow", actorId: state.id })
}
describe("publication and private research records", () => {
  it("keeps pending submissions outside public listings, posts, feed and AI reads", async () => {
    const result = await pendingThread()
    expect(result.status).toBe("pending")
    expect((await listThreads()).some((t) => t.id === result.threadId)).toBe(false)
    expect(await listPostsForThread(result.slug, result.threadId)).toEqual([])
    expect(await listPostsForThread(result.slug, result.threadId, ids[0], "member")).toHaveLength(1)
    expect((await recentActivity()).some((t) => t.targetId === result.threadId)).toBe(false)
    expect(
      (await readDiscussionTool.execute({ slug: result.slug }, { locale: "en", cart: [] })).content,
    ).toEqual({ error: "not_found" })
    await processModerationJobs()
    const [job] = await db.select().from(forumModerationJobs)
    expect(job?.status).toBe("human")
    expect((await listThreads()).some((t) => t.id === result.threadId)).toBe(false)
  })
  it("requires a human publication decision even after the AI suggests allow", async () => {
    const result = await pendingThread()
    state.configured = true
    state.complete.mockResolvedValue(
      JSON.stringify({ verdict: "allow", ruleCodes: [], note: "No lexical issue detected." }),
    )
    await processModerationJobs()
    expect((await listThreads()).some((t) => t.id === result.threadId)).toBe(false)
    const [post] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.threadId, result.threadId))
    if (!post) throw new Error("missing post")
    await approve(post.id)
    await approve(post.id)
    const published = (await listThreads()).find((t) => t.id === result.threadId)
    expect(published?.replyCount).toBe(0)
    expect((await recentActivity()).filter((t) => t.targetId === result.threadId)).toHaveLength(1)
    expect(
      await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ids[0] ?? "")),
    ).toHaveLength(1)
  })
  it("counts only published replies and removes hidden content from feeds", async () => {
    const thread = await pendingThread()
    const [original] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.threadId, thread.threadId))
    if (!original) throw new Error()
    await approve(original.id)
    state.id = ids[1] ?? ""
    state.role = "member"
    const reply = await createReply({
      threadSlug: thread.slug,
      body: "An alternative laboratory analysis is described in the original reference.",
    })
    if (!reply.ok) throw new Error(reply.reason)
    expect((await listThreads()).find((t) => t.id === thread.threadId)?.replyCount).toBe(0)
    await approve(reply.postId)
    expect((await listThreads()).find((t) => t.id === thread.threadId)?.replyCount).toBe(1)
    const [evt] = await db
      .select()
      .from(forumModerationEvents)
      .where(eq(forumModerationEvents.targetId, reply.postId))
    if (!evt) throw new Error()
    await moderatorVerdict({ eventId: evt.id, action: "remove", actorId: state.id })
    expect((await listThreads()).find((t) => t.id === thread.threadId)?.replyCount).toBe(0)
    expect((await recentActivity()).some((t) => t.targetId === reply.postId)).toBe(false)
  })
  it("does not let reactions or announcement publishing bypass review permissions", async () => {
    const thread = await pendingThread()
    const [post] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.threadId, thread.threadId))
    state.id = ids[1] ?? ""
    await expect(toggleReaction(post?.id ?? "", "helpful")).rejects.toThrow()
    const announcement = await createThread({
      categorySlug: "announcements",
      title: "QA unauthorized announcement",
      body: "This is only an isolated test, not a genuine staff announcement.",
    })
    expect(announcement.ok).toBe(false)
  })
  it("retries failed automatic checks durably while retaining human-review visibility", async () => {
    await pendingThread()
    state.configured = true
    state.complete.mockRejectedValue(new Error("provider_timeout"))
    for (let i = 0; i < 3; i++) {
      await db.update(forumModerationJobs).set({ availableAt: new Date(0) })
      await processModerationJobs()
    }
    const [job] = await db.select().from(forumModerationJobs)
    expect(job?.attempts).toBe(3)
    expect(job?.status).toBe("human")
    expect((await db.select().from(forumPosts))[0]?.status).toBe("pending")
  })
  it("counts category totals beyond the recent-six display", async () => {
    const category = await getCategoryBySlug("research-discussion")
    if (!category) throw new Error()
    const start = (await categoryThreadCounts()).get(category.id) ?? 0
    for (let i = 0; i < 9; i++)
      await db.insert(forumThreads).values({
        categoryId: category.id,
        authorId: ids[0],
        title: `QA count ${i}`,
        slug: `${prefix}-${i}`,
        status: "active",
      })
    expect((await categoryThreadCounts()).get(category.id)).toBe(start + 9)
  })
  it("keeps calculation history and drafts owner-scoped and deletes private data immediately", async () => {
    state.id = ids[0] ?? ""
    const input = { mode: "concentration", massMg: 10, finalVolumeMl: 2 }
    const saved = await saveCalculation(
      new Request("http://localhost/api/calculations", {
        headers: { origin: "http://localhost" },
        method: "POST",
        body: JSON.stringify({ inputs: input }),
      }),
    )
    expect(saved.status).toBe(201)
    const { item } = await saved.json()
    await saveDraft(
      new Request("http://localhost/api/forum/drafts", {
        headers: { origin: "http://localhost" },
        method: "PUT",
        body: JSON.stringify({
          title: "Private QA draft",
          body: "This text must stay private.",
          categorySlug: "research-discussion",
          locale: "fi",
        }),
      }),
    )
    expect((await (await getHistory()).json()).items).toHaveLength(1)
    expect((await (await getDraft()).json()).draft.body).toContain("private")
    state.id = ids[1] ?? ""
    expect((await (await getHistory()).json()).items).toHaveLength(0)
    expect((await (await getDraft()).json()).draft).toBeNull()
    expect(
      (
        await deleteCalculation(
          new Request("http://localhost/api/calculations", {
            method: "DELETE",
            headers: { origin: "http://localhost" },
          }),
          {
            params: Promise.resolve({ id: item.id }),
          },
        )
      ).status,
    ).toBe(404)
    const data = await exportUserData(ids[0] ?? "")
    expect(data.savedCalculations).toHaveLength(1)
    expect(data.forumDrafts).toHaveLength(1)
    await softDeleteUser(ids[0] ?? "")
    expect(await db.select().from(savedCalculations)).toHaveLength(0)
    expect(await db.select().from(forumDrafts)).toHaveLength(0)
  })
})
