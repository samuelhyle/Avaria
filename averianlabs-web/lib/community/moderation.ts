/** Durable AI suggestions. A human publication decision is always required. */
import { forumModerationEvents, forumModerationJobs, forumPosts } from "@/db/schema"
import { completeMinimaxChat, isMinimaxConfigured } from "@/lib/ai/providers/minimax"
import { db } from "@/lib/db"
import { and, eq, lte, or, sql } from "drizzle-orm"
import type { GuardResult } from "./guard"
export interface ModeratorResult {
  verdict: "allow" | "warn" | "remove"
  ruleCodes: string[]
  note: string
}
export function parseVerdict(raw: string): ModeratorResult | null {
  try {
    const obj = JSON.parse(raw.trim()) as Partial<ModeratorResult>
    if (!["allow", "warn", "remove"].includes(obj.verdict ?? "")) return null
    return {
      verdict: obj.verdict as ModeratorResult["verdict"],
      ruleCodes: Array.isArray(obj.ruleCodes)
        ? obj.ruleCodes.filter((x): x is string => typeof x === "string").slice(0, 12)
        : [],
      note: typeof obj.note === "string" ? obj.note.slice(0, 240) : "",
    }
  } catch {
    return null
  }
}
export async function processModerationJobs(limit = 1): Promise<{ processed: number }> {
  let processed = 0
  for (let i = 0; i < Math.min(limit, 3); i++) {
    const now = new Date()
    const claimed = await db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(forumModerationJobs)
        .where(
          or(
            and(
              eq(forumModerationJobs.status, "pending"),
              lte(forumModerationJobs.availableAt, now),
            ),
            and(
              eq(forumModerationJobs.status, "running"),
              lte(forumModerationJobs.lockedAt, new Date(Date.now() - 120000)),
            ),
          ),
        )
        .orderBy(forumModerationJobs.availableAt)
        .limit(1)
        .for("update", { skipLocked: true })
      if (!job) return null
      const [updated] = await tx
        .update(forumModerationJobs)
        .set({ status: "running", lockedAt: now, attempts: job.attempts + 1 })
        .where(eq(forumModerationJobs.id, job.id))
        .returning()
      return updated
    })
    if (!claimed) break
    const [post] = await db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.id, claimed.postId))
      .limit(1)
    let result: ModeratorResult = {
      verdict: "warn",
      ruleCodes: ["moderator_unavailable"],
      note: "Awaiting human review; automatic checks were unavailable.",
    }
    let retry = false
    if (post?.status === "pending" && isMinimaxConfigured()) {
      try {
        const { readFile } = await import("node:fs/promises")
        const { join } = await import("node:path")
        const prompt = await readFile(
          join(process.cwd(), "lib/ai/prompts/community-moderator.md"),
          "utf8",
        )
        if (!prompt.trim()) throw new Error("missing_prompt")
        const raw = await completeMinimaxChat({
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: post.body },
          ],
          temperature: 0,
          maxTokens: 300,
        })
        const parsed = parseVerdict(raw)
        if (!parsed) throw new Error("invalid_verdict")
        result = parsed
      } catch {
        retry = claimed.attempts < 3
      }
    }
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(forumModerationJobs)
        .where(eq(forumModerationJobs.id, claimed.id))
        .for("update")
      if (
        !current ||
        current.status !== "running" ||
        current.lockedAt?.getTime() !== claimed.lockedAt?.getTime()
      )
        return
      if (post?.status === "pending")
        await tx.insert(forumModerationEvents).values({
          targetType: "post",
          targetId: post.id,
          layer: "agent",
          verdict: result.verdict,
          ruleCodes: result.ruleCodes,
          note: result.note,
        })
      await tx
        .update(forumModerationJobs)
        .set({
          status: retry ? "pending" : "human",
          lockedAt: null,
          availableAt: new Date(Date.now() + 30000 * 2 ** claimed.attempts),
        })
        .where(eq(forumModerationJobs.id, claimed.id))
    })
    processed++
  }
  return { processed }
}
export function moderateAsync(_input: {
  postId: string
  body: string
  lexical: GuardResult
}): void {
  // The job was inserted in the same transaction as the pending post. A stopped
  // server or failed callback leaves it available to authenticated maintenance.
  void (async () => {
    try {
      const { after } = await import("next/server")
      after(() => processModerationJobs())
    } catch {
      /* maintenance will retry */
    }
  })()
}
export async function persistModerationEvent(input: {
  targetType: "post" | "thread"
  targetId: string
  layer: "lexical" | "agent" | "human"
  verdict: "allow" | "warn" | "remove"
  ruleCodes: string[]
  note: string
  actorId?: string
}): Promise<void> {
  await db.insert(forumModerationEvents).values({ ...input, actorId: input.actorId ?? null })
}
