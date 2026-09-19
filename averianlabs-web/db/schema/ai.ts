/**
 * AI / RAG schema (Phase A1) + memory & conversation persistence (Phase A3).
 *
 * `ai_documents` / `ai_document_chunks` — RAG chunks with embeddings.
 *
 * `ai_conversations` — one row per chat session, keyed by user OR anonymous
 *   visitor (the latter via a long-lived `averia:anon` cookie UUID).
 *
 * `ai_messages` — every message in a conversation, including tool trace and
 *   citations so we can replay / re-summarize / hand to a human later.
 *
 * `user_memories` — long-term user facts the agent has been told or inferred.
 *   Loaded into the system prompt on every turn.
 */

import { sql } from "drizzle-orm"
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

/** pgvector type. The dimension MUST match EMBEDDING_DIM — the migration
 *  `0001_align_embedding_dim.sql` aligns the column to that size. */
const pgVector = customType<{
  data: number[]
  driverData: string
  config: { dimensions?: number }
}>({
  dataType(config) {
    const dims = config?.dimensions ?? EMBEDDING_DIM
    if (dims !== EMBEDDING_DIM) {
      throw new Error(
        `pgVector dimension mismatch: schema declares EMBEDDING_DIM=${EMBEDDING_DIM} but config.dimensions=${dims}. Update EMBEDDING_DIM and run a migration instead of overriding per-column.`,
      )
    }
    return `vector(${dims})`
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`
  },
  fromDriver(value: string) {
    if (typeof value !== "string") return []
    const trimmed = value.replace(/^\[/, "").replace(/\]$/, "")
    if (!trimmed) return []
    return trimmed.split(",").map((n) => Number.parseFloat(n))
  },
})

/** Postgres `tsvector` — generated column, used for BM25 retrieval + GIN index. */
const tsVector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector"
  },
})

/**
 * Embedding dimensionality. Drives the pgvector column width AND the local
 * fallback model (all-MiniLM-L6-v2, 384-dim). When switching models, bump
 * this constant and add a migration that drops + recreates `embedding`.
 */
export const EMBEDDING_DIM = 384

export const aiDocuments = pgTable(
  "ai_documents",
  {
    id: text("id").primaryKey(),
    /** Logical source identifier, e.g. "product" or "sanity:peptideMonograph". */
    source: text("source").notNull(),
    /** The record's external id within `source` (slug, post id, etc.). */
    sourceId: text("source_id").notNull(),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    metadata: jsonb("metadata"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ai_documents_source_locale_idx").on(t.source, t.sourceId, t.locale),
    index("ai_documents_source_idx").on(t.source),
    index("ai_documents_locale_idx").on(t.locale),
  ],
)

export const aiDocumentChunks = pgTable(
  "ai_document_chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => aiDocuments.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    /** 0-indexed position of this chunk within its document. */
    position: integer("position").notNull(),
    content: text("content").notNull(),
    embedding: pgVector("embedding", { dimensions: EMBEDDING_DIM }),
    /** Token count (approximate, app-side). Useful for budgeting context windows. */
    tokenCount: integer("token_count").notNull().default(0),
    /** Generated tsvector for BM25 retrieval. */
    tsv: tsVector("tsv").generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce(content, '')), 'A')`,
    ),
  },
  (t) => [
    index("ai_chunks_document_idx").on(t.documentId, t.position),
    index("ai_chunks_locale_idx").on(t.locale),
  ],
)

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: text("id").primaryKey(),
    /** Authenticated user — nullable to support anonymous visitors. */
    userId: text("user_id"),
    /** Anonymous visitor UUID — paired with `user_id` is null. */
    anonymousId: text("anonymous_id"),
    locale: text("locale").notNull(),
    /** Auto-generated from the first user message (first 80 chars). */
    title: text("title"),
    /** Page context at conversation start. */
    contextKind: text("context_kind"),
    contextPath: text("context_path"),
    /** Whether the visitor opted in to conversation storage (GDPR). */
    optedIn: text("opted_in").notNull().default("declined"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("ai_conversations_user_idx").on(t.userId, t.lastMessageAt),
    index("ai_conversations_anon_idx").on(t.anonymousId, t.lastMessageAt),
    index("ai_conversations_locale_idx").on(t.locale),
    index("ai_conversations_last_message_idx").on(t.lastMessageAt),
  ],
)

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    /** Compact JSON of the tool trace + citations + proposed actions for replay. */
    metadata: jsonb("metadata"),
    /** Approximate token counts — filled in by the route after MiniMax reports. */
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    /** User feedback: "up" | "down" | null. */
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ai_messages_conversation_idx").on(t.conversationId, t.createdAt),
    index("ai_messages_feedback_idx").on(t.feedback),
  ],
)

export const userMemories = pgTable(
  "user_memories",
  {
    id: text("id").primaryKey(),
    /** Always required — even anonymous users get a UUID and can carry facts. */
    userId: text("user_id").notNull(),
    /** Stable key, e.g. "preferred_vial_size", "research_focus". */
    key: text("key").notNull(),
    /** JSON-serializable value. Strings, numbers, lists, nested objects ok. */
    value: jsonb("value").notNull(),
    /** "explicit" (user told us) or "inferred" (agent decided). */
    source: text("source").notNull().default("explicit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_memories_key_idx").on(t.userId, t.key),
    index("user_memories_user_idx").on(t.userId),
  ],
)

/**
 * Support tickets created by Averia — usually as a fallback when the agent
 * can't resolve a question. Carries the last 20 turns of conversation as
 * JSON so a human responder has full context.
 */
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: text("id").primaryKey(),
    /** Either linked to a real user or to an anonymous conversation id. */
    userId: text("user_id"),
    conversationId: text("conversation_id"),
    email: text("email").notNull(),
    /** Short subject shown in the admin queue. */
    subject: text("subject").notNull(),
    /** Long-form body with extra context. */
    body: text("body").notNull(),
    /** Originating channel: "averia" | "email" | "manual". */
    source: text("source").notNull().default("averia"),
    /** "open" | "pending" | "resolved" | "closed". */
    status: text("status").notNull().default("open"),
    /** Locale the ticket was filed in. */
    locale: text("locale").notNull().default("en"),
    /** Compact snapshot of the conversation turns at filing time. */
    transcript: jsonb("transcript"),
    /** Linked Averia conversation, if any. */
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    index("support_tickets_user_idx").on(t.userId),
    index("support_tickets_conversation_idx").on(t.conversationId),
    index("support_tickets_status_idx").on(t.status, t.createdAt),
  ],
)
