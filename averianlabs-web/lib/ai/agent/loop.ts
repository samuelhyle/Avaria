/**
 * Averia agent loop — multi-step tool-use reasoning with conversation memory.
 *
 * Flow per user turn:
 *   1. (Optional) Retrieve RAG context for the latest user message.
 *   2. Load user memories (if any) and inject into system prompt.
 *   3. Build system prompt with locale + page context + citations + memories.
 *   4. Loop up to `MAX_STEPS` times:
 *      a. Call MiniMax with messages + tools.
 *      b. Stream text deltas to the consumer as `text` events.
 *      c. Accumulate any tool-call deltas; once the stream completes, dispatch.
 *      d. For each tool call: emit `tool-call`, run handler, emit `tool-result`.
 *         If a `proposedAction` is returned, emit `action` (UI renders a card).
 *      e. If the model returned only text, we're done.
 *      f. Otherwise append the tool results and loop.
 *
 * The consumer is an `AgentSink` — anything with an `enqueue` method.
 * The chat route persists messages via the `onPersist` callback after the loop.
 */

import { type MemoryRow, listMemories } from "@/lib/ai/memory/store"
import {
  RESEARCH_FOOTER,
  type RetrievedCitation,
  buildSystemPrompt,
  shouldAppendResearchFooter,
} from "@/lib/ai/prompts/system"
import {
  type ChatMessagePayload,
  isMinimaxConfigured,
  streamMinimaxChat,
} from "@/lib/ai/providers/minimax"
import { retrieveContext } from "@/lib/ai/rag/retrieval"
import {
  applyToolCallDelta,
  createAssembler,
  finalizeAssembler,
} from "@/lib/ai/streaming/tool-call-assembler"
import {
  type ProposedAction,
  type ToolContext,
  listToolDefinitions,
  runTool,
} from "@/lib/ai/tools/registry"
import type { ChatContext, CitationRef } from "@/lib/ai/types"
import type { AgentEvent } from "@/lib/ai/types/events"
import type { Locale } from "@/lib/i18n/config"
import { logger } from "@/lib/logger"

const MAX_STEPS = 5
/** Default per-tool execution ceiling. Order/admin tools hit the DB; 5s is
 *  plenty for a single query and short enough that a hung DB doesn't freeze
 *  the agent. Override via `input.toolTimeoutMs`. */
const TOOL_TIMEOUT_MS = 5_000

export type { AgentEvent }

export interface AgentSink {
  enqueue(event: AgentEvent): void
}

export interface PersistedMessage {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  metadata?: {
    citations?: CitationRef[]
    toolTrace?: Array<{ id: string; name: string; args?: unknown; result?: unknown }>
    proposedActions?: ProposedAction[]
    /** Post-loop output verification — written when the route persists the turn. */
    verification?: VerificationReport
  } | null
  tokensIn?: number
  tokensOut?: number
  latencyMs?: number
}

/**
 * Output verification summary, persisted into `ai_messages.metadata` so we
 * can aggregate false-SKU / price-mismatch rates in analytics. The full
 * `VerificationReport` lives in `@/lib/ai/guardrails/verify`; this minimal
 * shape is the union of fields we want to keep across deploys.
 */
export interface VerificationReport {
  passed: boolean
  warnings: string[]
  unknownSkus: string[]
  priceMismatches: Array<{ sku: string; citedCents: number; catalogCents: number }>
  needsMedicalReminder: boolean
}

export interface AgentInput {
  locale: Locale
  context?: ChatContext
  /** Full conversation including prior turns. We re-send only the last 6 turns
   *  to MiniMax; the rest lives in the DB for context. */
  history: PersistedMessage[]
  /** The message the user is sending this turn (always the last `history` entry). */
  newUserMessage: PersistedMessage
  cart: ToolContext["cart"]
  /** Memory owner — only consulted if `optedIn` is true. */
  owner?: { kind: "anonymous"; anonymousId: string } | { kind: "user"; userId: string }
  /** Auth context — used for order/admin tools. */
  auth?: {
    userId: string
    email: string
    role: "customer" | "staff" | "admin" | "moderator"
  }
  /** When true, admin tools are exposed to the model. */
  isAdmin?: boolean
  /** Persisted conversation id (present when the session opted in). */
  conversationId?: string
  /** Advisory note passed to the system prompt (e.g. soft guardrail steer). */
  systemNote?: string
  signal?: AbortSignal
  noRetrieve?: boolean
  /** Max number of model steps before giving up. Default 5. */
  maxSteps?: number
  /** Per-tool execution timeout in milliseconds. Default 5_000. */
  toolTimeoutMs?: number
}

export async function runAgent(input: AgentInput, sink: AgentSink): Promise<void> {
  const startedAt = Date.now()
  if (!isMinimaxConfigured()) {
    sink.enqueue({ type: "error", message: "Averia is not configured." })
    return
  }

  // 1. Retrieve context (best-effort).
  let citations: RetrievedCitation[] = []
  const userQuery = input.newUserMessage.content

  if (!input.noRetrieve && userQuery) {
    try {
      const chunks = await retrieveContext({ query: userQuery, locale: input.locale, topK: 6 })
      citations = chunks.map((c, i) => ({
        index: i + 1,
        source: c.source,
        sourceId: c.sourceId,
        title: c.title,
        url: c.url,
        score: c.score,
        content: c.content,
      }))
    } catch (err) {
      logger.error("[averia] retrieval failed", err)
    }
  }

  if (citations.length > 0) {
    sink.enqueue({
      type: "citations",
      citations: citations.map(({ content: _content, ...rest }) => rest),
    })
  }

  // 2. Load memories (only if owner is provided and consent was given).
  const memories: MemoryRow[] = input.owner
    ? await listMemories(
        input.owner.kind === "user" ? input.owner.userId : input.owner.anonymousId,
      ).catch((err) => {
        logger.error("[averia] memory load failed", err)
        return []
      })
    : []

  const systemPrompt = buildSystemPrompt(
    input.locale,
    input.context,
    citations,
    memories,
    input.systemNote,
  )
  const nowIso = new Date().toISOString()
  const transcript = [...input.history, input.newUserMessage]
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-20)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      at: nowIso,
    }))
  const toolContext: ToolContext = {
    locale: input.locale,
    cart: input.cart,
    auth: input.auth,
    isAdmin: Boolean(input.isAdmin),
    transcript,
    conversationId: input.conversationId,
  }
  const tools = listToolDefinitions(toolContext)

  // 3. Conversation log. Send last 6 prior turns + this turn's user message.
  const recent = input.history.slice(-6)
  const chatMessages: ChatMessagePayload[] = [
    { role: "system", content: systemPrompt },
    ...recent.map((m) => ({ role: m.role, content: m.content }) as ChatMessagePayload),
    { role: "user", content: input.newUserMessage.content },
  ]

  const needsFooter = userQuery ? shouldAppendResearchFooter(userQuery) : false
  let finalText = ""
  let totalTokensIn = 0
  let totalTokensOut = 0
  let lastFinishReason: string | null = null

  const maxSteps = input.maxSteps ?? MAX_STEPS
  const toolTimeoutMs = input.toolTimeoutMs ?? TOOL_TIMEOUT_MS

  // One structured log line per turn so we can chart completion rate,
  // median latency, and tool-call frequency from log drains.
  const stepStartedAt = Date.now()
  let lastStepReached = 0
  logger.info("averia.turn.start", {
    locale: input.locale,
    userId: input.auth?.userId ?? (input.owner?.kind === "user" ? input.owner.userId : null),
    conversationId: input.conversationId,
    hasOwner: Boolean(input.owner),
    isAdmin: Boolean(input.isAdmin),
    noRetrieve: Boolean(input.noRetrieve),
  })

  for (let step = 0; step < maxSteps; step++) {
    lastStepReached = step
    if (input.signal?.aborted) {
      logger.info("averia.turn.aborted", { step, elapsedMs: Date.now() - stepStartedAt })
      return
    }

    // Capture the size of the request payload before we send it. After the
    // step we add the assistant message + tool results back into
    // `chatMessages`, so taking the diff on each iteration gives the actual
    // per-step prompt size instead of double-counting the system + history
    // across every step.
    const tokensInBefore = estimateTokens(JSON.stringify(chatMessages), input.locale)

    // Emit a thinking event so the UI can show "Averia is thinking..." even
    // before the first content delta lands.
    sink.enqueue({ type: "thinking", step })

    const textParts: string[] = []
    // Streamed tool-call deltas are routed by index — see
    // lib/ai/streaming/tool-call-assembler.ts for the why.
    const assembler = createAssembler()

    for await (const chunk of streamMinimaxChat({
      messages: chatMessages,
      tools,
      signal: input.signal,
    })) {
      if (input.signal?.aborted) return
      if (chunk.finish_reason) lastFinishReason = chunk.finish_reason

      const d = chunk.delta
      if (d.content) {
        textParts.push(d.content)
        sink.enqueue({ type: "text", delta: d.content })
      }
      if (d.tool_calls) {
        for (const tc of d.tool_calls) {
          applyToolCallDelta(assembler, tc)
        }
      }
    }

    const assistantText = textParts.join("")
    finalText += assistantText
    totalTokensOut += estimateTokens(assistantText, input.locale)

    const assembled = finalizeAssembler(assembler)

    if (assembled.length === 0) break

    chatMessages.push({
      role: "assistant",
      content: assistantText,
      tool_calls: assembled.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: tc.argsJson },
      })),
    })

    const results = await Promise.allSettled(
      assembled.map(async (tc) => {
        sink.enqueue({ type: "tool-call", id: tc.id, name: tc.name, args: safeParse(tc.argsJson) })
        let parsed: unknown = {}
        try {
          parsed = JSON.parse(tc.argsJson)
        } catch {
          parsed = {}
        }
        const result = await runToolWithTimeout(tc.name, parsed, toolContext, toolTimeoutMs)
        sink.enqueue({ type: "tool-result", id: tc.id, name: tc.name, content: result.content })
        if (result.proposedAction) sink.enqueue({ type: "action", action: result.proposedAction })
        return result
      }),
    )

    for (let i = 0; i < assembled.length; i++) {
      const tc = assembled[i]
      if (!tc) continue
      const r = results[i]
      const content =
        r?.status === "fulfilled"
          ? JSON.stringify(r.value.content)
          : JSON.stringify({ error: "tool_failed" })
      chatMessages.push({ role: "tool", tool_call_id: tc.id, content })
    }

    // Add the cost of this step's prompt: the size of the chatMessages
    // array as we sent it to MiniMax (captured at the top of the loop).
    totalTokensIn += tokensInBefore

    if (lastFinishReason !== "tool_calls") break
  }

  // Edge case: the model returned only tool calls and never produced a final
  // text answer (e.g. truncated, or finished with finish_reason="tool_calls"
  // and MAX_STEPS was hit). Surface a friendly fallback so the user isn't
  // left staring at an empty bubble.
  if (finalText.trim().length === 0) {
    const fallback =
      "I gathered the information I needed but didn't summarise it cleanly. Could you rephrase your question, or ask me to break it down into smaller steps?"
    sink.enqueue({ type: "text", delta: fallback })
    finalText = fallback
  }

  if (needsFooter && !finalText.includes(RESEARCH_FOOTER)) {
    sink.enqueue({ type: "text", delta: `\n\n${RESEARCH_FOOTER}` })
  }

  // `totalTokensIn` is now accumulated per step inside the loop (capturing
  // the prompt size BEFORE MiniMax saw it). This avoids the previous bug
  // where post-loop `JSON.stringify(chatMessages)` double-counted the system
  // prompt + history on every multi-step turn.

  logger.info("averia.turn.done", {
    locale: input.locale,
    conversationId: input.conversationId,
    elapsedMs: Date.now() - stepStartedAt,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    fallbackUsed: finalText !== "" && !finalText.includes("\n\n") && needsFooter,
    finishReason: lastFinishReason,
    stepCount: lastStepReached + 1,
  })

  sink.enqueue({
    type: "done",
    usage: {
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
      latencyMs: Date.now() - startedAt,
    },
  })
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

/**
 * Run a tool with a per-tool execution ceiling. When the timeout fires we
 * return a synthetic `{ error: "tool_timeout" }` payload so the model can
 * narrate the failure and the loop can continue with the remaining tools
 * instead of hanging on a single slow DB query.
 *
 * Falls back to `runTool` directly when `timeoutMs` is `Infinity` — useful
 * for tests and admin operations that legitimately need more time.
 */
async function runToolWithTimeout(
  name: string,
  args: unknown,
  ctx: ToolContext,
  timeoutMs: number,
) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return runTool(name, args, ctx)
  }
  const startedAt = Date.now()
  try {
    return await withTimeout(runTool(name, args, ctx), timeoutMs, () => {
      logger.warn("averia.tool_timeout", {
        tool: name,
        timeoutMs,
        elapsedMs: Date.now() - startedAt,
      })
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes("timed out")) {
      logger.warn("averia.tool_timeout_recovery", { tool: name, message })
      return { content: { error: "tool_timeout", tool: name, timeoutMs } }
    }
    logger.error("averia.tool_failed", { tool: name, message })
    return { content: { error: "tool_failed", tool: name, message } }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      onTimeout?.()
      reject(new Error(`tool execution timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (err) => {
        clearTimeout(t)
        reject(err)
      },
    )
  })
}

function estimateTokens(text: string, locale?: string): number {
  // English ~4 chars/token. Non-English tends to have more subword tokens:
  // German/Finnish/Swedish ~3.2, Dutch ~3.5. Use a conservative divisor.
  const divisor = locale && !["en", "nl"].includes(locale) ? 3.2 : 4
  return Math.ceil(text.length / divisor)
}

export const __test = { MAX_STEPS }
