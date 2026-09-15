"use client"

/**
 * Averia — chat hook with memory + consent.
 *
 * Manages:
 *   - An anonymous visitor ID (cookie + localStorage)
 *   - Consent state (opt-in for conversation persistence)
 *   - Conversation ID round-trip with the server
 *   - All 7 SSE event types from the agent loop
 */

import { getConsentState, getOrCreateAnonId, setConsentState } from "@/lib/ai/memory/consent-client"
import type { ChatContext, ChatMessage, CitationRef } from "@/lib/ai/types"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  type ActionResolution,
  type ProposedAction,
  type ProposedActionAddToCart,
  proposedActionKey,
} from "@/lib/ai/types/events"

export interface ToolTrace {
  id: string
  name: string
  args: unknown
  result?: unknown
}

export interface AveriaChatInput {
  locale: string
  context?: ChatContext
  cart?: ChatMessage["cart"]
  onSend?: (text: string) => void
  onError?: (err: Error) => void
  onConversationStart?: (id: string) => void
}

export interface ChatMessageWithExtras extends ChatMessage {
  citations?: CitationRef[]
  toolTrace?: ToolTrace[]
  proposedActions?: ProposedAction[]
  resolvedActions?: Record<string, ActionResolution>
  feedback?: "up" | "down"
}

export interface AveriaChat {
  messages: ChatMessageWithExtras[]
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  error: Error | null
  consent: "accepted" | "declined" | "unset"
  setConsent: (state: "accepted" | "declined") => void
  conversationId: string | null
  submit: (text: string) => void
  stop: () => void
  reset: () => void
  /** Re-send the last user message. Preserves conversation context. */
  retry: () => void
  /** Mark a proposed action as confirmed or dismissed in the local transcript. */
  resolveAction: (messageId: string, action: ProposedAction, state: ActionResolution) => void
  /** Track thumbs state locally so the UI reflects the choice immediately. */
  setFeedback: (messageId: string, feedback: "up" | "down") => void
}

const INITIAL: ChatMessageWithExtras[] = []

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

interface AssistantExtras {
  citations?: CitationRef[]
  toolTrace?: ToolTrace[]
  proposedActions?: ProposedAction[]
  resolvedActions?: Record<string, ActionResolution>
  feedback?: "up" | "down"
}

type CartItem = NonNullable<ChatMessage["cart"]>[number]

export function useAveriaChat({
  locale,
  context,
  cart,
  onSend,
  onError,
  onConversationStart,
}: AveriaChatInput): AveriaChat {
  const [messages, setMessages] = useState<ChatMessageWithExtras[]>(INITIAL)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [consent, setConsentStateHook] = useState<"accepted" | "declined" | "unset">("unset")
  const [conversationId, setConversationId] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const extrasRef = useRef<Map<string, AssistantExtras>>(new Map())
  const anonIdRef = useRef<string>("")

  // Hydrate consent + anon ID on first render.
  useEffect(() => {
    anonIdRef.current = getOrCreateAnonId()
    setConsentStateHook(getConsentState())
  }, [])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const setConsent = useCallback((state: "accepted" | "declined") => {
    setConsentState(state)
    setConsentStateHook(state)
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
  }, [])

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const userMsg: ChatMessageWithExtras = {
        id: makeId(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      }
      const assistantId = makeId()
      const assistantMsg: ChatMessageWithExtras = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput("")
      setIsLoading(true)
      setError(null)
      onSend?.(trimmed)

      const history = [...messages, userMsg]
        .filter((m) => m.content.trim().length > 0)
        .slice(-40)
        .map((m) => ({ id: m.id, role: m.role, content: m.content }))

      void (async () => {
        try {
          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              messages: history,
              locale,
              context,
              cart: cart ?? [],
              conversationId: conversationId ?? undefined,
            }),
            signal: controller.signal,
          })

          if (!res.ok) {
            // Try to extract the server-side error code so the UI can show a
            // specific message (rate-limit vs. config vs. generic).
            let bodyText = ""
            try {
              bodyText = await res.text()
            } catch {}
            throw classifyHttpError(res.status, bodyText)
          }

          const reader = res.body?.getReader()
          if (!reader) throw new Error("No stream")

          const decoder = new TextDecoder()
          let buffer = ""

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let nl = buffer.indexOf("\n\n")
            while (nl !== -1) {
              const event = buffer.slice(0, nl).trim()
              buffer = buffer.slice(nl + 2)
              if (!event.startsWith("data:")) continue
              const payload = event.slice(5).trim()
              if (!payload) continue
              try {
                const msg = JSON.parse(payload) as AgentEventWire
                handleWireEvent(msg, assistantId)
              } catch (parseErr) {
                if (parseErr instanceof Error && parseErr.message.startsWith("Chat failed"))
                  throw parseErr
              }
              nl = buffer.indexOf("\n\n")
            }
          }
        } catch (err) {
          if (controller.signal.aborted) return
          const e = err instanceof Error ? err : new Error("Unknown chat error")
          setError(e)
          onError?.(e)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.content === ""
                ? { ...m, content: placeholderForError(e) }
                : m,
            ),
          )
        } finally {
          if (abortRef.current === controller) abortRef.current = null
          setIsLoading(false)
        }
      })()

      function handleWireEvent(msg: AgentEventWire, aid: string) {
        if (msg.type === "text") {
          setMessages((prev) =>
            prev.map((m) => (m.id === aid ? { ...m, content: m.content + msg.delta } : m)),
          )
        } else if (msg.type === "thinking") {
          // Hook intentionally a no-op — `isLoading` already drives the spinner,
          // and `toolTrace` (below) shows the actual tool chips. Keep the event
          // on the wire for parity with server logs.
        } else if (msg.type === "citations") {
          const cur = extrasRef.current.get(aid) ?? {}
          extrasRef.current.set(aid, { ...cur, citations: msg.citations })
          setMessages((prev) => [...prev])
        } else if (msg.type === "tool-call") {
          const cur = extrasRef.current.get(aid) ?? {}
          const trace = [...(cur.toolTrace ?? []), { id: msg.id, name: msg.name, args: msg.args }]
          extrasRef.current.set(aid, { ...cur, toolTrace: trace })
          setMessages((prev) => [...prev])
        } else if (msg.type === "tool-result") {
          const cur = extrasRef.current.get(aid) ?? {}
          const trace = (cur.toolTrace ?? []).map((t) =>
            t.id === msg.id ? { ...t, result: msg.content } : t,
          )
          extrasRef.current.set(aid, { ...cur, toolTrace: trace })
          setMessages((prev) => [...prev])
        } else if (msg.type === "action") {
          const cur = extrasRef.current.get(aid) ?? {}
          const actions = [...(cur.proposedActions ?? []), msg.action]
          extrasRef.current.set(aid, { ...cur, proposedActions: actions })
          setMessages((prev) => [...prev])
        } else if (msg.type === "conversation") {
          if (!conversationId) {
            setConversationId(msg.id)
            onConversationStart?.(msg.id)
          }
        } else if (msg.type === "done") {
          // Adopt the server-persisted assistant message id so feedback maps to
          // a real row. Extras must be keyed the same way.
          if (msg.messageId && msg.messageId !== aid) {
            const extras = extrasRef.current.get(aid)
            if (extras) {
              extrasRef.current.set(msg.messageId, extras)
              extrasRef.current.delete(aid)
            }
            const serverId = msg.messageId
            setMessages((prev) => prev.map((m) => (m.id === aid ? { ...m, id: serverId } : m)))
          }
        } else if (msg.type === "error") {
          throw new Error(msg.message)
        }
      }
    },
    [cart, context, conversationId, locale, messages, onConversationStart, onError, onSend],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    extrasRef.current.clear()
    setMessages([])
    setError(null)
    setIsLoading(false)
    setConversationId(null)
  }, [])

  /**
   * Re-send the last user message. Preserves the conversation context so
   * the user doesn't lose their place after a transient failure.
   */
  const retry = useCallback(() => {
    if (isLoading) return
    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    if (!lastUser) {
      reset()
      return
    }
    // Drop the empty assistant placeholder and any partial error state, then
    // resubmit. The hook is idempotent on submit().
    setMessages((prev) => prev.filter((m) => !(m.role === "assistant" && m.content === "")))
    setError(null)
    submit(lastUser.content)
  }, [isLoading, messages, reset, submit])

  const resolveAction = useCallback(
    (messageId: string, action: ProposedAction, state: ActionResolution) => {
      const cur = extrasRef.current.get(messageId) ?? {}
      const key = proposedActionKey(action)
      extrasRef.current.set(messageId, {
        ...cur,
        resolvedActions: { ...(cur.resolvedActions ?? {}), [key]: state },
      })
      setMessages((prev) => [...prev])
    },
    [],
  )

  const setFeedback = useCallback((messageId: string, feedback: "up" | "down") => {
    const cur = extrasRef.current.get(messageId) ?? {}
    extrasRef.current.set(messageId, { ...cur, feedback })
    setMessages((prev) => [...prev])
  }, [])

  const enrichedMessages = messages.map((m) => {
    const extra = extrasRef.current.get(m.id)
    if (!extra) return m
    return { ...m, ...extra } as ChatMessageWithExtras
  })

  return {
    messages: enrichedMessages,
    input,
    setInput,
    isLoading,
    error,
    consent,
    setConsent,
    conversationId,
    submit,
    stop,
    reset,
    retry,
    resolveAction,
    setFeedback,
  }
}

type AgentEventWire = import("@/lib/ai/types/events").AgentEvent

/**
 * Map an HTTP failure to a friendly, user-actionable Error. The caller can
 * inspect `e.name` to choose between showing "rate limited", "try again", or
 * "Averia is offline".
 */
function classifyHttpError(status: number, body: string): Error {
  let code = "unknown"
  try {
    const parsed = JSON.parse(body) as { code?: string; message?: string }
    if (parsed?.code) code = parsed.code
  } catch {
    // Body wasn't JSON — fall through with code "unknown".
  }
  if (status === 429 || code === "rate_limited") {
    const e = new Error("You're sending messages a bit fast. Please slow down and try again in a minute.")
    e.name = "rate_limited"
    return e
  }
  if (status === 503 || code === "provider_unavailable") {
    const e = new Error("Averia is offline right now. Set MINIMAX_API_KEY to enable the chat.")
    e.name = "provider_unavailable"
    return e
  }
  if (status === 400 || code === "invalid_request") {
    const e = new Error("That message couldn't be sent. Try clearing the conversation and sending again.")
    e.name = "invalid_request"
    return e
  }
  if (status >= 500) {
    const e = new Error("Averia hit a server problem. Please try again in a moment.")
    e.name = "server_error"
    return e
  }
  const e = new Error(`Chat failed (${status})`)
  e.name = code
  return e
}

/** Italic placeholder shown when the assistant bubble is empty after an error. */
function placeholderForError(err: Error): string {
  switch (err.name) {
    case "rate_limited":
      return "_Slow down a touch — Averia's rate limit kicked in. Try again in a minute._"
    case "provider_unavailable":
      return "_Averia is offline. Check that MINIMAX_API_KEY is configured._"
    case "invalid_request":
      return "_That message couldn't be sent. Clear the conversation and try again._"
    case "server_error":
      return "_Averia hit a problem on our side. Try again in a moment._"
    default:
      return "_Averia didn't respond just now. Try again in a moment._"
  }
}

export type { CartItem }
