-- AI memory & conversation persistence (Phase A3)
--
-- Adds:
--   - ai_conversations: one row per chat session, keyed by user OR anonymous id
--   - ai_messages:      every message in a conversation, with metadata for replay
--   - user_memories:    long-term user facts injected into the system prompt
--
-- All GDPR-aware: opted_in is required on conversations, and `ai_messages`
-- cascades on conversation delete. Anonymous IDs are cookie UUIDs.

CREATE TABLE "ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"anonymous_id" text,
	"locale" text NOT NULL,
	"title" text,
	"context_kind" text,
	"context_path" text,
	"opted_in" text DEFAULT 'declined' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);

--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "user_memories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"source" text DEFAULT 'explicit' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "ai_conversations_user_idx" ON "ai_conversations" USING btree ("user_id","last_message_at");
--> statement-breakpoint
CREATE INDEX "ai_conversations_anon_idx" ON "ai_conversations" USING btree ("anonymous_id","last_message_at");
--> statement-breakpoint
CREATE INDEX "ai_conversations_locale_idx" ON "ai_conversations" USING btree ("locale");
--> statement-breakpoint
CREATE INDEX "ai_messages_conversation_idx" ON "ai_messages" USING btree ("conversation_id","created_at");
--> statement-breakpoint
CREATE INDEX "ai_messages_feedback_idx" ON "ai_messages" USING btree ("feedback");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_memories_key_idx" ON "user_memories" USING btree ("user_id","key");
--> statement-breakpoint
CREATE INDEX "user_memories_user_idx" ON "user_memories" USING btree ("user_id");
