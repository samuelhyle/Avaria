"use client"

/**
 * Averia — chat hook with memory + consent.
 *
 * Manages:
 *   - An anonymous visitor ID (cookie + localStorage)
 *   - Consent state (opt-in for conversation persistence)
 *   - Conversation ID round-trip with the server
 *   - All SSE event types from the agent loop (text / thinking / citations /
 *     tool-call / tool-result / action / conversation / done / error)
 */

import { getConsentState, getOrCreateAnonId, setConsentState } from "@/lib/ai/memory/consent-client"
import { parseSseStream } from "@/lib/ai/streaming/sse"
import type { ChatContext, ChatMessage, CitationRef } from "@/lib/ai/types"
import { safeUuid } from "@/lib/utils/uuid"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  type ActionResolution,
  type ProposedAction,
  type ProposedActionAddToCart,
  proposedActionKey,
} from "@/lib/ai/types/events"
import { classifyHttpError, placeholderForError } from "./error-utils"

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
  // Bumped every time an extras ref mutates, so the memoized `enrichedMessages`
  // can pick up citations / toolTrace / proposedActions / feedback changes.
  const [extrasVersion, setExtrasVersion] = useState(0)
  const bumpExtras = useCallback(() => setExtrasVersion((v) => v + 1), [])

  const abortRef = useRef<AbortController | null>(null)
  const extrasRef = useRef<Map<string, AssistantExtras>>(new Map())
  const anonIdRef = useRef<string>("")

  // Refs for the values that change between renders but should NOT cause
  // `submit` / `retry` to be re-created. We mutate them in render (cheap,
  // synchronous, no re-render). Consumers that pass fresh `cart` /
  // `context` / `locale` props on every render would otherwise trigger
  // exponential churn down the tree.
  const messagesRef = useRef<ChatMessageWithExtras[]>(messages)
  const conversationIdRef = useRef<string | null>(conversationId)
  const localeRef = useRef<string>(locale)
  const contextRef = useRef<AveriaChatInput["context"]>(context)
  const cartRef = useRef<AveriaChatInput["cart"]>(cart)
  const onSendRef = useRef<AveriaChatInput["onSend"]>(onSend)
  const onErrorRef = useRef<AveriaChatInput["onError"]>(onError)
  const onConversationStartRef = useRef<AveriaChatInput["onConversationStart"]>(onConversationStart)
  messagesRef.current = messages
  conversationIdRef.current = conversationId
  localeRef.current = locale
  contextRef.current = context
  cartRef.current = cart
  onSendRef.current = onSend
  onErrorRef.current = onError
  onConversationStartRef.current = onConversationStart

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
        id: safeUuid(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      }
      const assistantId = safeUuid()
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
      onSendRef.current?.(trimmed)

      const history = [...messagesRef.current, userMsg]
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
              locale: localeRef.current,
              context: contextRef.current,
              cart: cartRef.current ?? [],
              conversationId: conversationIdRef.current ?? undefined,
              // Server signs this and attaches it as `Set-Cookie: averia_anon`
              // on the response. Falls back to the existing cookie when this
              // is omitted; either path is fine server-side.
              anonId:
                anonIdRef.current && anonIdRef.current !== "ssr" ? anonIdRef.current : undefined,
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

          const stream = res.body
          if (!stream) throw new Error("No stream")

          for await (const event of parseSseStream(stream)) {
            handleWireEvent(event, assistantId)
          }
        } catch (err) {
          if (controller.signal.aborted) {
            // User-initiated stop — drop the empty placeholder so the user
            // isn't left staring at an in-progress assistant bubble, and
            // clear any in-flight error state from a prior failed turn.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId && m.content === "" ? { ...m, content: "_Stopped._" } : m,
              ),
            )
            return
          }
          const e = err instanceof Error ? err : new Error("Unknown chat error")
          setError(e)
          onErrorRef.current?.(e)
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
          bumpExtras()
        } else if (msg.type === "tool-call") {
          const cur = extrasRef.current.get(aid) ?? {}
          const trace = [...(cur.toolTrace ?? []), { id: msg.id, name: msg.name, args: msg.args }]
          extrasRef.current.set(aid, { ...cur, toolTrace: trace })
          bumpExtras()
        } else if (msg.type === "tool-result") {
          const cur = extrasRef.current.get(aid) ?? {}
          const trace = (cur.toolTrace ?? []).map((t) =>
            t.id === msg.id ? { ...t, result: msg.content } : t,
          )
          extrasRef.current.set(aid, { ...cur, toolTrace: trace })
          bumpExtras()
        } else if (msg.type === "action") {
          const cur = extrasRef.current.get(aid) ?? {}
          const actions = [...(cur.proposedActions ?? []), msg.action]
          extrasRef.current.set(aid, { ...cur, proposedActions: actions })
          bumpExtras()
        } else if (msg.type === "conversation") {
          if (!conversationIdRef.current) {
            setConversationId(msg.id)
            onConversationStartRef.current?.(msg.id)
          }
        } else if (msg.type === "done") {
          // Adopt the server-persisted assistant message id so feedback maps to
          // a real row. We keep BOTH the client-side id and the server-persisted
          // id as keys in extrasRef so any action/feedback click that landed
          // before the re-render (and therefore still references the old id)
          // can still find the extras object. Old keys are pruned by `reset()`.
          if (msg.messageId && msg.messageId !== aid) {
            const extras = extrasRef.current.get(aid)
            if (extras) extrasRef.current.set(msg.messageId, extras)
            const serverId = msg.messageId
            setMessages((prev) => prev.map((m) => (m.id === aid ? { ...m, id: serverId } : m)))
          }
        } else if (msg.type === "error") {
          throw new Error(msg.message)
        }
      }
    },
    // bumpExtras is stable (useCallback([])) and only used to trigger a
    // re-render when extrasRef mutates. Including it here is documentation
    // as much as correctness — it has no effect on identity or behaviour.
    [bumpExtras],
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
    const lastUser = [...messagesRef.current].reverse().find((m) => m.role === "user")
    if (!lastUser) {
      reset()
      return
    }
    // Drop the empty assistant placeholder and any partial error state, then
    // resubmit. The hook is idempotent on submit().
    setMessages((prev) => prev.filter((m) => !(m.role === "assistant" && m.content === "")))
    setError(null)
    submit(lastUser.content)
  }, [isLoading, reset, submit])

  const resolveAction = useCallback(
    (messageId: string, action: ProposedAction, state: ActionResolution) => {
      // The message id can be either the client-generated one or the
      // server-persisted one — we keep both keys in extrasRef during the
      // `done`-event swap so a click that landed before the re-render still
      // finds the extras object under its original id. Both keys point at
      // the same object, so writing to either one mirrors to the other.
      const key = proposedActionKey(action)
      const ref = extrasRef.current
      const extras = ref.get(messageId)
      if (!extras) return
      ref.set(messageId, {
        ...extras,
        resolvedActions: { ...(extras.resolvedActions ?? {}), [key]: state },
      })
      bumpExtras()
    },
    [bumpExtras],
  )

  const setFeedback = useCallback(
    (messageId: string, feedback: "up" | "down") => {
      const ref = extrasRef.current
      const extras = ref.get(messageId)
      if (!extras) return
      ref.set(messageId, { ...extras, feedback })
      bumpExtras()
    },
    [bumpExtras],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: `extrasVersion` is the signal that `extrasRef` (a ref) mutated; biome cannot see through refs. Without it the memo would never recompute when citations / toolTrace / actions arrive after the messages state has settled.
  const enrichedMessages = useMemo(
    () =>
      messages.map((m) => {
        const extra = extrasRef.current.get(m.id)
        if (!extra) return m
        return { ...m, ...extra } as ChatMessageWithExtras
      }),
    [messages, extrasVersion],
  )

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

export type { CartItem }
