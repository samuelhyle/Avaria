-- Availability notifications.
--
-- The product page tells a shopper that they will be emailed when a lot is
-- released. That promise needs somewhere to live: one row per address and
-- SKU, so a repeated request updates the existing row instead of filling
-- the list with the same person.
CREATE TABLE "product_waitlist" (
 "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "sku" text NOT NULL,
 "email" text NOT NULL,
 "name" text,
 "locale" text NOT NULL DEFAULT 'en',
 "status" text DEFAULT 'open' NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "notified_at" timestamp with time zone,
 CONSTRAINT "product_waitlist_status_check" CHECK ("product_waitlist"."status" IN ('open', 'notified'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "product_waitlist_sku_email_idx" ON "product_waitlist" ("sku", "email");
--> statement-breakpoint
CREATE INDEX "product_waitlist_status_idx" ON "product_waitlist" ("status");
--> statement-breakpoint
CREATE INDEX "product_waitlist_sku_idx" ON "product_waitlist" ("sku");
