/**
 * POST /api/ai/chat
 *
 * Streaming chat endpoint for Averia. Pipeline:
 *   1. Validate body + rate-limit.
 *   2. Input guardrail (injection / abuse / medical-bypass detection).
 *   3. Resolve owner (anonymous or user) + consent state.
 *   4. If consented, load or create a conversation and hydrate recent history.
 *   5. Run the agent loop, streaming events to the client.
 *   6. Output verification (SKU/price consistency, medical-claim footer).
 *   7. Persist messages after the loop if opted in (best-effort).
 *
 * SSE event types (all framed as `data: <json>\n\n`):
 *   - { type: "text", delta }
 *   - { type: "citations", citations }
 *   - { type: "tool-call", id, name, args }
 *   - { type: "tool-result", id, name, content }
 *   - { type: "action", action }
 *   - { type: "conversation", id }
 *   - { type: "done", usage, verification? }
 *   - { type: "error", message }
 */

import { getAdminOrNull } from "@/lib/admin/guard"
import { type AgentEvent, type PersistedMessage, runAgent } from "@/lib/ai/agent/loop"
import { preflightInput } from "@/lib/ai/guardrails/input"
import { verifyResponse } from "@/lib/ai/guardrails/verify"
import { getAnonFromRequest, getConsentFromRequest } from "@/lib/ai/memory/consent"
import {
  type ConversationOwner,
  appendMessages,
  getOrCreateConversation,
  loadRecentMessages,
  setConversationTitle,
} from "@/lib/ai/memory/store"
import { RESEARCH_FOOTER } from "@/lib/ai/prompts/system"
import { isMinimaxConfigured } from "@/lib/ai/providers/minimax"
import { type ChatIdentity, checkChatRateLimit } from "@/lib/ai/rate-limit"
import type { ChatErrorBody } from "@/lib/ai/types"
import { auth } from "@/lib/auth"
import type { Locale } from "@/lib/i18n/config"
import { clientIp } from "@/lib/security/ip"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const messageSchema = z.object({
  id: z.string().min(1).max(64),
  // Only user/assistant turns are accepted from clients — never system/tool.
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
})

const cartItemSchema = z.object({
  sku: z.string(),
  productSlug: z.string(),
  name: z.string(),
  mg: z.number(),
  qty: z.number(),
  unitPriceCents: z.number(),
})

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  locale: z.string().min(2).max(5).optional(),
  context: z
    .object({
      kind: z.enum(["home", "shop", "product", "category", "cart", "blog", "support", "other"]),
      slug: z.string().optional(),
      name: z.string().optional(),
      title: z.string().optional(),
      itemCount: z.number().int().min(0).optional(),
      path: z.string().optional(),
    })
    .optional(),
  cart: z.array(cartItemSchema).optional(),
  // Round-trip the conversation id from a previous turn. Server still
  // resolves ownership via owner+locale and may ignore this id if the
  // session is anonymous, has no consent, or the row was deleted.
  conversationId: z.string().min(1).max(128).optional(),
  noRetrieve: z.boolean().optional(),
  noPersist: z.boolean().optional(),
})

function jsonError(body: ChatErrorBody, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}

export async function POST(request: Request): Promise<Response> {
  if (!isMinimaxConfigured()) {
    return jsonError(
      {
        error: true,
        code: "provider_unavailable",
        message:
          "Averia is not configured on this environment. Set MINIMAX_API_KEY to enable the chat.",
      },
      503,
    )
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    const raw = (await request.json()) as unknown
    parsed = bodySchema.parse(raw)
  } catch {
    return jsonError(
      { error: true, code: "invalid_request", message: "Invalid request body." },
      400,
    )
  }

  const ip = clientIp(request)
  const locale = (parsed.locale ?? "en") as Locale

  // ── Resolve session early for rate limiting ─────────────────────────
  const session = await auth().catch(() => null)
  const sessionUser = session?.user as
    | { id?: string; email?: string; role?: "customer" | "staff" | "admin" }
    | null
    | undefined
  const userId = sessionUser?.id ?? null
  const userEmail = sessionUser?.email ?? ""
  const claimedAdmin = sessionUser?.role === "admin" || sessionUser?.role === "staff"
  // JWT role claims can be stale; verify admin status against the database.
  const admin = claimedAdmin && userId ? await getAdminOrNull() : null
  const isAdmin = Boolean(admin)
  const userRole = admin ? admin.role : "customer"

  const identity: ChatIdentity = userId ? { kind: "user", userId } : { kind: "anonymous", ip }
  const rl = await checkChatRateLimit(identity)
  if (!rl.ok) {
    return jsonError(
      { error: true, code: "rate_limited", message: "Too many requests. Please slow down." },
      429,
    )
  }

  // ── Input guardrail ───────────────────────────────────────────────────
  const lastMsg = parsed.messages[parsed.messages.length - 1]
  if (!lastMsg) {
    return jsonError({ error: true, code: "invalid_request", message: "Empty conversation." }, 400)
  }

  const inputCheck = preflightInput(lastMsg.content, locale)
  // Older client-supplied turns are replayed to the model for non-consenting
  // visitors — scan them too, not just the newest message.
  const priorHardCheck = parsed.messages
    .slice(0, -1)
    .map((m) => preflightInput(m.content, locale))
    .find((check) => check?.hard)
  const blockedCheck = inputCheck?.hard ? inputCheck : priorHardCheck
  if (blockedCheck?.hard) {
    // Hard refusal — skip the agent loop entirely.
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text", delta: blockedCheck.userMessage })}\n\n`,
          ),
        )
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", usage: { tokensIn: 0, tokensOut: 0, latencyMs: 0 } })}\n\n`,
          ),
        )
        controller.close()
      },
    })
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    })
  }

  const consent = getConsentFromRequest(request)
  const anonId = getAnonFromRequest(request)

  // Resolve owner.
  const owner: ConversationOwner | null =
    consent === "accepted"
      ? userId
        ? { kind: "user", userId }
        : anonId
          ? { kind: "anonymous", anonymousId: anonId }
          : null
      : null

  // When consented, load history from DB. When not consented, fall back to
  // the client-sent messages so the model still has multi-turn context.
  let conversation: Awaited<ReturnType<typeof getOrCreateConversation>> | null = null
  let history: PersistedMessage[] = []

  if (owner) {
    try {
      conversation = await getOrCreateConversation({
        owner,
        locale,
        contextKind: parsed.context?.kind,
        contextPath: parsed.context?.path,
        optedIn: "accepted",
      })
      const recent = await loadRecentMessages(conversation.id, 12)
      history = recent.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system" | "tool",
        content: m.content,
        metadata: m.metadata as PersistedMessage["metadata"],
      }))
    } catch (err) {
      console.error("[averia] conversation load failed", err)
    }
  } else {
    // Non-consenting users still get multi-turn context from the client.
    // Take all messages except the last (which is the new user message).
    const prior = parsed.messages.slice(0, -1)
    history = prior.slice(-6).map((m, i) => ({
      id: m.id ?? `h-${i}`,
      role: m.role as "user" | "assistant" | "system" | "tool",
      content: m.content,
    }))
  }

  const newUserMessage: PersistedMessage = {
    id: lastMsg.id,
    role: "user",
    content: lastMsg.content,
  }

  // Auto-title on first user message.
  if (conversation && !conversation.title) {
    void setConversationTitle(conversation.id, lastMsg.content)
  }

  const encoder = new TextEncoder()
  let cancelled = false
  request.signal.addEventListener("abort", () => {
    cancelled = true
  })

  // Collect events for persistence — only for messages + tool trace + actions.
  const assistantId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const toolTrace: Array<{ id: string; name: string; args?: unknown; result?: unknown }> = []
  const citations: Array<unknown> = []
  const actions: Array<unknown> = []
  let usage = { tokensIn: 0, tokensOut: 0, latencyMs: 0 }
  let accumulatedText = ""

  const controllerRef = { current: null as ReadableStreamDefaultController<Uint8Array> | null }

  const sink = {
    enqueue(event: AgentEvent): void {
      if (cancelled) return
      const wire: AgentEvent = event.type === "done" ? { ...event, messageId: assistantId } : event
      try {
        controllerRef.current?.enqueue(encoder.encode(`data: ${JSON.stringify(wire)}\n\n`))
      } catch {
        // Controller may have been closed if client disconnected.
      }
      if (event.type === "text") {
        accumulatedText += event.delta
      } else if (event.type === "tool-call") {
        toolTrace.push({ id: event.id, name: event.name, args: event.args })
      } else if (event.type === "tool-result") {
        const t = toolTrace.find((x) => x.id === event.id)
        if (t) t.result = event.content
      } else if (event.type === "citations") {
        citations.push(...event.citations)
      } else if (event.type === "action") {
        actions.push(event.action)
      } else if (event.type === "done") {
        usage = event.usage
      }
    },
  }

  // Soft guardrail hits steer the model via a system note instead of cutting
  // the user off with a canned refusal.
  const softRefusal = inputCheck && !inputCheck.hard ? inputCheck.userMessage : undefined

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef.current = controller

      if (conversation) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "conversation", id: conversation.id })}\n\n`,
            ),
          )
        } catch {}
      }

      void runAgent(
        {
          locale,
          context: parsed.context as import("@/lib/ai/types").ChatContext | undefined,
          history,
          newUserMessage,
          cart: parsed.cart ?? [],
          owner: owner ?? undefined,
          auth: userId ? { userId, email: userEmail, role: userRole } : undefined,
          isAdmin,
          conversationId: conversation?.id,
          systemNote: softRefusal,
          signal: request.signal,
          noRetrieve: parsed.noRetrieve,
        },
        sink,
      )
        .catch((err) => {
          if (!cancelled) {
            console.error("[averia] agent failed", err)
            sink.enqueue({
              type: "error",
              message: "Averia hit a problem. Please try again in a moment.",
            })
          }
        })
        .finally(async () => {
          // ── Output verification ───────────────────────────────────────────
          // Strip model reasoning blocks before verification + persistence
          // (the client also hides them at render time).
          accumulatedText = accumulatedText.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").trim()
          const report = verifyResponse(accumulatedText)
          if (
            report.unknownSkus.length > 0 ||
            report.priceMismatches.length > 0 ||
            report.warnings.length > 0
          ) {
            console.warn("[averia] output verification", {
              conversationId: conversation?.id,
              unknownSkus: report.unknownSkus,
              priceMismatches: report.priceMismatches,
              warnings: report.warnings,
            })
          }
          if (report.needsMedicalReminder && !accumulatedText.includes(RESEARCH_FOOTER)) {
            sink.enqueue({ type: "text", delta: `\n\n${RESEARCH_FOOTER}` })
          }

          // Persist the turn (best-effort, never blocks the stream).
          if (conversation && !parsed.noPersist && !cancelled) {
            try {
              await appendMessages(conversation.id, [
                newUserMessage,
                {
                  id: assistantId,
                  role: "assistant",
                  content: accumulatedText,
                  metadata: {
                    citations,
                    toolTrace,
                    proposedActions: actions,
                  },
                  tokensIn: usage.tokensIn,
                  tokensOut: usage.tokensOut,
                  latencyMs: usage.latencyMs,
                },
              ])
            } catch (err) {
              console.error("[averia] persist failed", err)
            }
          }
          try {
            controller.close()
          } catch {}
        })
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  })
}
