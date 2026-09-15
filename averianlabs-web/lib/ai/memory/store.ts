/**
 * Conversation + memory store.
 *
 * Pure DB ops — no HTTP / cookie concerns (those live in `consent.ts`).
 *
 * - `getOrCreateConversation` — upsert by (anonymousId | userId, locale).
 *   Always returns the row, creating one if needed.
 * - `appendMessages` — batch-insert the user + assistant turn at the end of a
 *   chat turn. Caller is responsible for assembling both rows.
 * - `loadRecentMessages` — fetch the last N messages in chronological order.
 * - `setConversationTitle` — auto-derive from first user message.
 * - `listConversations` / `deleteConversation` — for the UI sidebar.
 * - `userMemories` — CRUD over `user_memories` keyed by (userId, key).
 */

import { aiConversations, aiMessages, userMemories } from "@/db/schema/ai"
import { db } from "@/lib/db"
import { and, desc, eq, inArray, sql } from "drizzle-orm"

export type ConversationOwner =
  | { kind: "anonymous"; anonymousId: string }
  | { kind: "user"; userId: string }

export interface ConversationRow {
  id: string
  userId: string | null
  anonymousId: string | null
  locale: string
  title: string | null
  contextKind: string | null
  contextPath: string | null
  optedIn: string
  createdAt: Date
  lastMessageAt: Date
  deletedAt: Date | null
}

export interface MessageInsert {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  metadata?: {
    citations?: unknown[]
    toolTrace?: unknown[]
    proposedActions?: unknown[]
  } | null
  tokensIn?: number
  tokensOut?: number
  latencyMs?: number
}

export interface MessageRow {
  id: string
  conversationId: string
  role: string
  content: string
  metadata: unknown
  tokensIn: number
  tokensOut: number
  latencyMs: number
  feedback: string | null
  createdAt: Date
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function getOrCreateConversation(input: {
  owner: ConversationOwner
  locale: string
  contextKind?: string
  contextPath?: string
  optedIn: "accepted" | "declined"
}): Promise<ConversationRow> {
  const ownerFilter =
    input.owner.kind === "anonymous"
      ? eq(aiConversations.anonymousId, input.owner.anonymousId)
      : eq(aiConversations.userId, input.owner.userId)

  // Look up the most recent non-deleted conversation for this owner+locale.
  const existing = await db
    .select()
    .from(aiConversations)
    .where(
      and(
        ownerFilter,
        eq(aiConversations.locale, input.locale),
        eq(aiConversations.optedIn, input.optedIn),
      ),
    )
    .orderBy(desc(aiConversations.lastMessageAt))
    .limit(1)

  if (existing[0] && !existing[0].deletedAt) {
    return existing[0]
  }

  const id = `c-${uuid()}`
  const row = {
    id,
    userId: input.owner.kind === "user" ? input.owner.userId : null,
    anonymousId: input.owner.kind === "anonymous" ? input.owner.anonymousId : null,
    locale: input.locale,
    title: null,
    contextKind: input.contextKind ?? null,
    contextPath: input.contextPath ?? null,
    optedIn: input.optedIn,
    createdAt: new Date(),
    lastMessageAt: new Date(),
    deletedAt: null,
  }
  await db.insert(aiConversations).values(row)
  return row as ConversationRow
}

export async function setConversationTitle(conversationId: string, title: string): Promise<void> {
  await db
    .update(aiConversations)
    .set({ title: title.slice(0, 80) })
    .where(eq(aiConversations.id, conversationId))
}

export async function touchConversation(conversationId: string): Promise<void> {
  await db
    .update(aiConversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(aiConversations.id, conversationId))
}

export async function appendMessages(
  conversationId: string,
  messages: MessageInsert[],
): Promise<void> {
  if (messages.length === 0) return
  await db.insert(aiMessages).values(
    messages.map((m) => ({
      id: m.id,
      conversationId,
      role: m.role,
      content: m.content,
      metadata: m.metadata ?? null,
      tokensIn: m.tokensIn ?? 0,
      tokensOut: m.tokensOut ?? 0,
      latencyMs: m.latencyMs ?? 0,
    })),
  )
  await touchConversation(conversationId)
}

export async function loadRecentMessages(
  conversationId: string,
  limit = 20,
): Promise<MessageRow[]> {
  const rows = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(desc(aiMessages.createdAt))
    .limit(limit)
  return rows.reverse()
}

export async function loadConversation(id: string): Promise<ConversationRow | null> {
  const rows = await db.select().from(aiConversations).where(eq(aiConversations.id, id)).limit(1)
  return (rows[0] ?? null) as ConversationRow | null
}

export async function listConversations(
  owner: ConversationOwner,
  limit = 20,
): Promise<ConversationRow[]> {
  const ownerFilter =
    owner.kind === "anonymous"
      ? eq(aiConversations.anonymousId, owner.anonymousId)
      : eq(aiConversations.userId, owner.userId)
  const rows = await db
    .select()
    .from(aiConversations)
    .where(ownerFilter)
    .orderBy(desc(aiConversations.lastMessageAt))
    .limit(limit)
  return rows.filter((r) => !r.deletedAt)
}

export async function deleteConversation(id: string): Promise<void> {
  // Soft delete so analytics can still see deletion rates without losing data.
  await db.update(aiConversations).set({ deletedAt: new Date() }).where(eq(aiConversations.id, id))
}

export async function hardDeleteUserData(owner: ConversationOwner): Promise<void> {
  // GDPR Art. 17 — full erase on account deletion.
  const ownerFilter =
    owner.kind === "anonymous"
      ? eq(aiConversations.anonymousId, owner.anonymousId)
      : eq(aiConversations.userId, owner.userId)
  const convs = await db.select({ id: aiConversations.id }).from(aiConversations).where(ownerFilter)
  const ids = convs.map((c) => c.id)
  if (ids.length > 0) {
    await db.delete(aiMessages).where(inArray(aiMessages.conversationId, ids))
    await db.delete(aiConversations).where(inArray(aiConversations.id, ids))
  }
  const userId = owner.kind === "user" ? owner.userId : null
  if (userId) {
    await db.delete(userMemories).where(eq(userMemories.userId, userId))
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * USER MEMORIES
 * ────────────────────────────────────────────────────────────────────────── */

export interface MemoryRow {
  id: string
  userId: string
  key: string
  value: unknown
  source: string
  createdAt: Date
  updatedAt: Date
}

export async function listMemories(userId: string): Promise<MemoryRow[]> {
  const rows = await db.select().from(userMemories).where(eq(userMemories.userId, userId))
  return rows as MemoryRow[]
}

export async function countMemories(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userMemories)
    .where(eq(userMemories.userId, userId))
  return rows[0]?.count ?? 0
}

export async function upsertMemory(input: {
  userId: string
  key: string
  value: unknown
  source?: "explicit" | "inferred"
}): Promise<MemoryRow> {
  const existing = await db
    .select()
    .from(userMemories)
    .where(and(eq(userMemories.userId, input.userId), eq(userMemories.key, input.key)))
    .limit(1)
  if (existing[0]) {
    await db
      .update(userMemories)
      .set({ value: input.value, source: input.source ?? "explicit", updatedAt: new Date() })
      .where(eq(userMemories.id, existing[0].id))
    return {
      ...existing[0],
      value: input.value,
      source: input.source ?? "explicit",
      updatedAt: new Date(),
    } as MemoryRow
  }
  const id = `mem-${uuid()}`
  const row = {
    id,
    userId: input.userId,
    key: input.key,
    value: input.value,
    source: input.source ?? "explicit",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await db.insert(userMemories).values(row)
  return row as MemoryRow
}

export async function deleteMemory(userId: string, key: string): Promise<void> {
  await db
    .delete(userMemories)
    .where(and(eq(userMemories.userId, userId), eq(userMemories.key, key)))
}

export async function deleteAllMemories(userId: string): Promise<void> {
  await db.delete(userMemories).where(eq(userMemories.userId, userId))
}
