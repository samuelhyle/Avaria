/**
 * Averia — AI concierge shared types.
 *
 * Used by both the SSE route handler and the client-side chat hook so that
 * message shapes stay in lock-step. Phase A0 keeps this intentionally narrow
 * (plain text only); tool calls and citations come in later phases.
 */

export type ChatRole = "system" | "user" | "assistant"

export interface CartItem {
  sku: string
  productSlug: string
  name: string
  mg: number
  qty: number
  unitPriceCents: number
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  /** ISO timestamp, used for ordering and UI display. */
  createdAt: string
  /** Cart snapshot sent to the server on every request. */
  cart?: CartItem[]
}

export type ChatContext =
  | { kind: "home" }
  | { kind: "shop" }
  | { kind: "product"; slug: string; name: string }
  | { kind: "category"; slug: string }
  | { kind: "cart"; itemCount: number }
  | { kind: "blog"; slug: string; title: string }
  | { kind: "support" }
  | { kind: "other"; path: string }

/** Payload accepted by POST /api/ai/chat. */
export interface ChatRequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>
  context?: ChatContext
  /** Locale used to localize the system prompt + greeting. */
  locale?: string
  /** Cart snapshot — sent on every request so the agent can reason about it. */
  cart?: CartItem[]
  /** Disable retrieval (used by eval / tests). */
  noRetrieve?: boolean
}

export interface CitationRef {
  index: number
  source: string
  sourceId: string
  title: string
  url: string | null
  score: number
}

/** Stable error code returned in the JSON error body. */
export type ChatErrorCode =
  | "rate_limited"
  | "unauthorized"
  | "invalid_request"
  | "provider_unavailable"
  | "internal_error"

export interface ChatErrorBody {
  error: true
  code: ChatErrorCode
  message: string
}

export type { AgentEvent, ProposedAction, ProposedActionAddToCart } from "./types/events"
