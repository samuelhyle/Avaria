/**
 * Shared SSE event types for the Averia chat stream.
 *
 * Used by both the server route (enqueues events) and the client hook
 * (parses events). Defining them here prevents the two sides from drifting.
 */

import type { CitationRef } from "@/lib/ai/types"

export type ProposedActionAddToCart = {
  kind: "add_to_cart"
  sku: string
  productSlug: string
  productName: string
  mg: number
  qty: number
  unitPriceCents: number
}

export type ProposedActionRemember = {
  kind: "remember"
  key: string
  value: string
}

export type ProposedAction =
  | ProposedActionAddToCart
  | { kind: "remove_from_cart"; sku: string }
  | ProposedActionRemember

/** How the user resolved a proposed action card. */
export type ActionResolution = "added" | "dismissed"

/** Stable identity for a proposed action, shared by hook state and UI. */
export function proposedActionKey(action: ProposedAction): string {
  if (action.kind === "add_to_cart") return `add:${action.sku}`
  if (action.kind === "remove_from_cart") return `remove:${action.sku}`
  return `remember:${action.key}`
}

export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "citations"; citations: CitationRef[] }
  | { type: "tool-call"; id: string; name: string; args: unknown }
  | { type: "tool-result"; id: string; name: string; content: unknown }
  | { type: "action"; action: ProposedAction }
  | { type: "conversation"; id: string }
  | {
      type: "done"
      usage: { tokensIn: number; tokensOut: number; latencyMs: number }
      /** Persisted assistant message id — absent when the turn isn't stored. */
      messageId?: string
    }
  | { type: "error"; message: string }
