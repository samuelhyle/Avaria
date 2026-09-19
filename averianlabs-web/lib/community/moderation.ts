/**
 * Layer 2 of the moderation pipeline — LLM moderator.
 *
 * Uses the shared MiniMax provider wrapper (timeout + config in one place).
 * Fails to the human queue on any error — never silently allows.
 */
import { completeMinimaxChat, isMinimaxConfigured } from "@/lib/ai/providers/minimax"
import { logger } from "@/lib/logger"
import type { GuardResult } from "./guard"

export type ModeratorVerdict = "allow" | "warn" | "remove"

export interface ModeratorResult {
  verdict: ModeratorVerdict
  ruleCodes: string[]
  note: string
}

const PROMPT_CACHE = new Map<string, string>()

async function loadPrompt(): Promise<string> {
  const cached = PROMPT_CACHE.get("default")
  if (cached !== undefined) return cached
  try {
    const fs = await import("node:fs/promises")
    const path = await import("node:path")
    const file = path.join(process.cwd(), "lib/ai/prompts/community-moderator.md")
    const content = await fs.readFile(file, "utf8")
    PROMPT_CACHE.set("default", content)
    return content
  } catch {
    PROMPT_CACHE.set("default", "")
    return ""
  }
}

async function callLLM(systemPrompt: string, postBody: string): Promise<ModeratorResult> {
  const raw = await completeMinimaxChat({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: postBody },
    ],
    temperature: 0,
    maxTokens: 200,
  })
  return parseVerdict(raw) ?? MODERATOR_UNAVAILABLE
}

/** Fail-open to the *human queue* (warn), never silently to allow. */
const MODERATOR_UNAVAILABLE: ModeratorResult = {
  verdict: "warn",
  ruleCodes: ["moderator_unavailable"],
  note: "Automatic moderation was unavailable — please review manually.",
}

function parseVerdict(raw: string): ModeratorResult | null {
  const trimmed = raw.trim()
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const obj = JSON.parse(match[0]) as Partial<ModeratorResult>
    const verdict = obj.verdict
    if (verdict !== "allow" && verdict !== "warn" && verdict !== "remove") return null
    return {
      verdict,
      ruleCodes: Array.isArray(obj.ruleCodes)
        ? obj.ruleCodes.filter((c) => typeof c === "string")
        : [],
      note: typeof obj.note === "string" ? obj.note.slice(0, 240) : "",
    }
  } catch {
    return null
  }
}

export function moderateAsync(input: { postId: string; body: string; lexical: GuardResult }): void {
  if (!isMinimaxConfigured()) return
  if (input.lexical.verdict === "block") return

  const work = async () => {
    const prompt = await loadPrompt()
    if (!prompt) return
    let result: ModeratorResult
    try {
      result = await callLLM(prompt, input.body)
    } catch (err) {
      logger.error("[community] moderation LLM failed:", err)
      result = MODERATOR_UNAVAILABLE
    }
    await persistModerationEvent({
      targetType: "post",
      targetId: input.postId,
      layer: "agent",
      verdict: result.verdict,
      ruleCodes: result.ruleCodes,
      note: result.note,
    })
  }

  // `after()` keeps the work alive after the response on serverless; fall back
  // to fire-and-forget when called outside a request scope.
  void (async () => {
    try {
      const { after } = await import("next/server")
      after(work)
    } catch {
      void work().catch(() => {})
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
  try {
    const { db } = await import("@/lib/db")
    const { forumModerationEvents } = await import("@/db/schema")
    await db.insert(forumModerationEvents).values({
      targetType: input.targetType,
      targetId: input.targetId,
      layer: input.layer,
      verdict: input.verdict,
      ruleCodes: input.ruleCodes,
      note: input.note,
      actorId: input.actorId ?? null,
    })
  } catch {
    // best-effort; never crash the request path
  }
}
