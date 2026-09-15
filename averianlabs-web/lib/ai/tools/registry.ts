/**
 * Tool registry — the schema + handler for every tool Averia can call.
 *
 * Each tool exports:
 *   - `definition`: OpenAI-compatible JSON schema (name, description, parameters)
 *   - `execute(args, ctx)`: runs server-side; returns a `ToolResult`
 *
 * Handlers must be pure-ish: read DB / products / cart store; never mutate the
 * cart directly. Mutating actions (addToCart, etc.) return a `proposedAction`
 * payload that the client renders as a confirmation card.
 */

import { adminDraftReplyTool } from "@/lib/ai/tools/admin/draft-reply"
import { adminListLowStockTool } from "@/lib/ai/tools/admin/list-low-stock"
import { adminLookupOrderTool } from "@/lib/ai/tools/admin/lookup-order"
import { addToCartTool } from "@/lib/ai/tools/cart"
import { compareProductsTool } from "@/lib/ai/tools/compare"
import { createSupportTicketTool } from "@/lib/ai/tools/create-support-ticket"
import { escalateTool } from "@/lib/ai/tools/escalate"
import { getBatchesTool } from "@/lib/ai/tools/get-batches"
import { getProductTool } from "@/lib/ai/tools/get-product"
import { getOrderStatusTool } from "@/lib/ai/tools/order-status"
import { reconstitutionTool } from "@/lib/ai/tools/reconstitution"
import { rememberPreferenceTool } from "@/lib/ai/tools/remember"
import { searchProductsTool } from "@/lib/ai/tools/search-products"
import { trackShipmentTool } from "@/lib/ai/tools/track-shipment"
import { viewCartTool } from "@/lib/ai/tools/view-cart"
import type { ProposedAction } from "@/lib/ai/types/events"
import type { Locale } from "@/lib/i18n/config"

export type { ProposedAction }

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, unknown>
    required: string[]
  }
}

export interface ToolContext {
  locale: Locale
  /** Read-only snapshot of the cart as last seen by the client. May be empty
   *  on first turn — the agent calls viewCart() to populate it. */
  cart: Array<{
    sku: string
    productSlug: string
    name: string
    mg: number
    qty: number
    unitPriceCents: number
  }>
  /** Optional auth — present when the user is signed in. */
  auth?: {
    userId: string
    email: string
    role: "customer" | "staff" | "admin" | "moderator"
  }
  /** When auth.role is staff/admin, expose admin tools. */
  isAdmin?: boolean
  /** Recent conversation turns, injected by the agent loop so tools like
   *  createSupportTicket can attach context without the model re-sending it. */
  transcript?: Array<{ role: "user" | "assistant"; content: string; at: string }>
  /** The persisted conversation id, when the session is opted in. */
  conversationId?: string
}

export interface ToolResult {
  /** Plain-text or JSON-serializable payload shown back to the model. */
  content: unknown
  /** Optional proposed action awaiting user confirmation in the UI. */
  proposedAction?: ProposedAction
}

export interface Tool {
  definition: ToolDefinition
  /** When true, the tool is hidden from non-admin callers. */
  requiresAdmin?: boolean
  execute: (args: unknown, ctx: ToolContext) => Promise<ToolResult>
}

export const TOOL_REGISTRY: Record<string, Tool> = {
  [searchProductsTool.definition.name]: searchProductsTool,
  [getProductTool.definition.name]: getProductTool,
  [getBatchesTool.definition.name]: getBatchesTool,
  [compareProductsTool.definition.name]: compareProductsTool,
  [reconstitutionTool.definition.name]: reconstitutionTool,
  [rememberPreferenceTool.definition.name]: rememberPreferenceTool,
  [viewCartTool.definition.name]: viewCartTool,
  [addToCartTool.definition.name]: addToCartTool,
  [escalateTool.definition.name]: escalateTool,
  [getOrderStatusTool.definition.name]: getOrderStatusTool,
  [trackShipmentTool.definition.name]: trackShipmentTool,
  [createSupportTicketTool.definition.name]: createSupportTicketTool,
  [adminListLowStockTool.definition.name]: adminListLowStockTool,
  [adminLookupOrderTool.definition.name]: adminLookupOrderTool,
  [adminDraftReplyTool.definition.name]: adminDraftReplyTool,
}

/** Return OpenAI-compatible tool descriptors for the chat completion call.
 *  Filters out admin tools when the caller isn't an admin. */
export function listToolDefinitions(ctx?: ToolContext): Array<{
  type: "function"
  function: ToolDefinition
}> {
  return Object.values(TOOL_REGISTRY)
    .filter((t) => {
      if (t.requiresAdmin && !ctx?.isAdmin) return false
      return true
    })
    .map((t) => ({
      type: "function" as const,
      function: t.definition,
    }))
}

/** Resolve and execute a tool by name. Throws if not found or forbidden. */
export async function runTool(name: string, args: unknown, ctx: ToolContext): Promise<ToolResult> {
  const tool = TOOL_REGISTRY[name]
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  if (tool.requiresAdmin && !ctx.isAdmin) {
    throw new Error(`Tool ${name} requires admin role`)
  }
  return tool.execute(args, ctx)
}
