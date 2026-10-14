import { activityEvents, forumModerationJobs, forumPosts, forumThreads } from "@/db/schema"
import type { db } from "@/lib/db"
import { and, eq, inArray, sql } from "drizzle-orm"
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
/** Thread then post lock order; derived counts are recalculated, not incremented. */
export async function setPostPublication(tx: Transaction, postId: string, publish: boolean) {
  const [ref] = await tx
    .select({ threadId: forumPosts.threadId })
    .from(forumPosts)
    .where(eq(forumPosts.id, postId))
  if (!ref) throw new Error("post_not_found")
  const [thread] = await tx
    .select()
    .from(forumThreads)
    .where(eq(forumThreads.id, ref.threadId))
    .for("update")
  if (!thread) throw new Error("thread_not_found")
  const [post] = await tx.select().from(forumPosts).where(eq(forumPosts.id, postId)).for("update")
  if (!post) throw new Error("post_not_found")
  const wasPublic = ["active", "edited"].includes(post.status)
  await tx
    .update(forumPosts)
    .set({ status: publish ? "active" : "removed" })
    .where(eq(forumPosts.id, postId))
  const original = thread.originalPostId === postId
  if (original)
    await tx
      .update(forumThreads)
      .set({ status: publish ? "active" : "removed" })
      .where(eq(forumThreads.id, thread.id))
  const [count] = await tx
    .select({ n: sql<number>`count(*)::integer` })
    .from(forumPosts)
    .where(
      and(
        eq(forumPosts.threadId, thread.id),
        inArray(forumPosts.status, ["active", "edited"]),
        sql`${forumPosts.id} <> ${thread.originalPostId ?? ""}`,
      ),
    )
  await tx
    .update(forumThreads)
    .set({ replyCount: count?.n ?? 0, lastActivityAt: new Date() })
    .where(eq(forumThreads.id, thread.id))
  await tx
    .update(forumModerationJobs)
    .set({ status: "done", lockedAt: null })
    .where(eq(forumModerationJobs.postId, postId))
  if (publish && !wasPublic)
    await tx.insert(activityEvents).values({
      kind: original ? "thread_created" : "post_created",
      actorId: post.authorId,
      targetType: original ? "thread" : "post",
      targetId: original ? thread.id : post.id,
      targetSlug: thread.slug,
      targetTitle: thread.title,
    })
  return { thread, post, changed: post.status !== (publish ? "active" : "removed"), original }
}
