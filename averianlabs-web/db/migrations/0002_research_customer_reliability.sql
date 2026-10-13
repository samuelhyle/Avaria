ALTER TABLE "batches" ADD COLUMN "verification_status" text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "reviewed_by" text;
--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "reviewed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_verification_status_check" CHECK ("verification_status" IN ('pending', 'released', 'rejected'));
--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_release_review_check" CHECK ("verification_status" <> 'released' OR ("reviewed_by" IS NOT NULL AND "reviewed_at" IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_key" text UNIQUE;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "checkout_hash" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" text DEFAULT 'stripe' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vat_id" text;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "sku_snapshot" text;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "name_snapshot" text;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "size_value_snapshot" double precision;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "size_unit_snapshot" text;
--> statement-breakpoint
CREATE TABLE "email_outbox" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "dedupe_key" text NOT NULL UNIQUE,
  "recipient" text NOT NULL,
  "reply_to" text,
  "subject" text NOT NULL,
  "html" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lease_until" timestamp with time zone,
  "last_error" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_outbox_due_idx" ON "email_outbox" ("next_attempt_at") WHERE "status" <> 'sent';
--> statement-breakpoint
CREATE TABLE "quote_requests" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_key" text NOT NULL UNIQUE,
  "sku" text NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "organisation" text,
  "message" text,
  "locale" text DEFAULT 'en' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "batch_code_snapshot" text;

--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "terms_accepted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "terms_version" text;
