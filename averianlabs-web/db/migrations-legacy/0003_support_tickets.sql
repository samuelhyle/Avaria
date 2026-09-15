-- Support tickets (Phase A5)
--
-- Created by Averia's `createSupportTicket` tool when the agent can't resolve
-- a question in-line. Carries a compact transcript so a human responder has
-- full context.

CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"conversation_id" text,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"source" text DEFAULT 'averia' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"transcript" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);

--> statement-breakpoint
CREATE INDEX "support_tickets_user_idx" ON "support_tickets" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "support_tickets_conversation_idx" ON "support_tickets" USING btree ("conversation_id");
--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status","created_at");
