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

const MAX_STEPS = 5

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
  } | null
  tokensIn?: number
  tokensOut?: number
  latencyMs?: number
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
      console.error("[averia] retrieval failed", err)
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
        console.error("[averia] memory load failed", err)
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

  for (let step = 0; step < MAX_STEPS; step++) {
    if (input.signal?.aborted) return

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
        const result = await runTool(tc.name, parsed, toolContext)
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

  if (needsFooter && !finalText.includes("Research use only")) {
    sink.enqueue({ type: "text", delta: `\n\n${RESEARCH_FOOTER}` })
  }

  totalTokensIn += estimateTokens(JSON.stringify(chatMessages))

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

function estimateTokens(text: string, locale?: string): number {
  // English ~4 chars/token. Non-English tends to have more subword tokens:
  // German/Finnish/Swedish ~3.2, Dutch ~3.5. Use a conservative divisor.
  const divisor = locale && !["en", "nl"].includes(locale) ? 3.2 : 4
  return Math.ceil(text.length / divisor)
}

export const __test = { MAX_STEPS }
