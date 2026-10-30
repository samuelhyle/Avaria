-- Telegram delivery queue, crypto checkout sessions and crypto deposits.
--
-- The Telegram outbox mirrors email_outbox: a dedupe key makes every message
-- exactly-once, a lease prevents two workers claiming the same row, and a
-- failed send backs off exponentially.
CREATE TABLE "telegram_outbox" (
 "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "dedupe_key" text NOT NULL UNIQUE,
 "chat_id" text NOT NULL,
 "text" text NOT NULL,
 "parse_mode" text DEFAULT 'HTML' NOT NULL,
 "replaces_message_id" text,
 "status" text DEFAULT 'pending' NOT NULL,
 "attempts" integer DEFAULT 0 NOT NULL,
 "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
 "lease_until" timestamp with time zone,
 "sent_at" timestamp with time zone,
 "last_error" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "telegram_outbox_due_idx" ON "telegram_outbox" ("status","next_attempt_at");
--> statement-breakpoint
-- One row per Telegram invoice. `id` is the opaque token in the t.me deep link.
CREATE TABLE "crypto_checkout_sessions" (
 "id" text PRIMARY KEY NOT NULL,
 "order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
 "chain" text NOT NULL,
 "amount_crypto" text NOT NULL,
 "amount_eur_cents" integer NOT NULL,
 "rate_eur_per_unit" double precision NOT NULL,
 "wallet_address" text NOT NULL,
 "match_mode" text DEFAULT 'address' NOT NULL,
 "status" text DEFAULT 'created' NOT NULL,
 "telegram_user_id" text,
 "telegram_chat_id" text,
 "bot_message_id" text,
 "expires_at" timestamp with time zone NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "crypto_sessions_order_idx" ON "crypto_checkout_sessions" ("order_id");
--> statement-breakpoint
CREATE INDEX "crypto_sessions_status_idx" ON "crypto_checkout_sessions" ("status");
--> statement-breakpoint
CREATE INDEX "crypto_sessions_chain_idx" ON "crypto_checkout_sessions" ("chain");
--> statement-breakpoint
-- Every deposit the watcher has seen, matched or not. Unmatched deposits are
-- what makes a manual "match by transaction hash" override possible.
CREATE TABLE "crypto_deposits" (
 "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "chain" text NOT NULL,
 "tx_hash" text NOT NULL,
 "wallet_address" text NOT NULL,
 "amount_crypto" text NOT NULL,
 "confirmations" integer DEFAULT 0 NOT NULL,
 "seen_at" timestamp with time zone DEFAULT now() NOT NULL,
 "matched_session_id" text,
 "raw" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX "crypto_deposits_chain_tx_idx" ON "crypto_deposits" ("chain","tx_hash");
--> statement-breakpoint
CREATE INDEX "crypto_deposits_session_idx" ON "crypto_deposits" ("matched_session_id");
