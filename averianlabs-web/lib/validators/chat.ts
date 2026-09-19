/**
 * Shared Zod schemas for Averia chat API.
 * Imported by both client (hooks) and server (route handlers) for consistency.
 */

import { z } from "zod"

export const messageSchema = z.object({
  id: z.string().min(1).max(64),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
})

export type ChatMessageInput = z.infer<typeof messageSchema>

export const cartItemSchema = z.object({
  sku: z.string(),
  productSlug: z.string(),
  name: z.string(),
  mg: z.number(),
  qty: z.number(),
  unitPriceCents: z.number(),
})

export type CartItemInput = z.infer<typeof cartItemSchema>

export const contextSchema = z.object({
  kind: z.enum(["home", "shop", "product", "category", "cart", "blog", "support", "other"]),
  slug: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  itemCount: z.number().int().min(0).optional(),
  path: z.string().optional(),
})

export type ChatContextInput = z.infer<typeof contextSchema>

export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  locale: z.string().min(2).max(5).optional(),
  context: contextSchema.optional(),
  cart: z.array(cartItemSchema).optional(),
  conversationId: z.string().min(1).max(128).optional(),
  anonId: z.string().uuid().optional(),
  noRetrieve: z.boolean().optional(),
  noPersist: z.boolean().optional(),
})

export type ChatRequestInput = z.infer<typeof chatRequestSchema>

export const chatErrorSchema = z.object({
  error: z.boolean(),
  code: z.string(),
  message: z.string(),
})

export type ChatErrorBody = z.infer<typeof chatErrorSchema>

export const chatEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({ type: z.literal("thinking") }),
  z.object({ type: z.literal("citations"), citations: z.array(z.unknown()) }),
  z.object({
    type: z.literal("tool-call"),
    id: z.string(),
    name: z.string(),
    args: z.unknown(),
  }),
  z.object({
    type: z.literal("tool-result"),
    id: z.string(),
    name: z.string(),
    content: z.string(),
  }),
  z.object({ type: z.literal("action"), action: z.unknown() }),
  z.object({ type: z.literal("conversation"), id: z.string() }),
  z.object({
    type: z.literal("done"),
    usage: z.object({ tokensIn: z.number(), tokensOut: z.number(), latencyMs: z.number() }),
    verification: z.unknown().optional(),
    messageId: z.string().optional(),
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
])

export type AgentEvent = z.infer<typeof chatEventSchema>
