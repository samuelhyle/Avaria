-- Promotions: server-side discount rules.
--
-- A promotion is resolved and priced on the server inside quoteCart() and the
-- resulting discount is part of the quote hash, so a client can never decide
-- its own discount and a quote priced without a code cannot be spent with one.
CREATE TABLE "promotions" (
 "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "code" text NOT NULL UNIQUE,
 "kind" text DEFAULT 'percent' NOT NULL,
 "value" integer DEFAULT 0 NOT NULL,
 "min_subtotal_cents" integer DEFAULT 0 NOT NULL,
 "max_redemptions" integer,
 "redemption_count" integer DEFAULT 0 NOT NULL,
 "active" boolean DEFAULT true NOT NULL,
 "starts_at" timestamp with time zone,
 "ends_at" timestamp with time zone,
 "label" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "promotions_kind_check" CHECK ("promotions"."kind" IN ('percent', 'fixed', 'free_shipping')),
 CONSTRAINT "promotions_value_check" CHECK ("promotions"."value" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_code_idx" ON "promotions" ("code");
--> statement-breakpoint
CREATE INDEX "promotions_active_idx" ON "promotions" ("active");
--> statement-breakpoint
-- One row per accepted use of a promotion, written with the order in the same
-- transaction so the redemption count cannot drift from real orders.
CREATE TABLE "promotion_redemptions" (
 "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "promotion_id" text NOT NULL REFERENCES "promotions"("id") ON DELETE CASCADE,
 "order_id" text REFERENCES "orders"("id") ON DELETE CASCADE,
 "email" text,
 "discount_cents" integer DEFAULT 0 NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "promotion_redemptions_promo_idx" ON "promotion_redemptions" ("promotion_id");
--> statement-breakpoint
CREATE INDEX "promotion_redemptions_order_idx" ON "promotion_redemptions" ("order_id");
--> statement-breakpoint
-- subtotal_cents keeps holding the amount the customer pays for the products,
-- so subtotal + shipping = total still holds. The pre-discount figure is
-- subtotal_cents + discount_cents.
ALTER TABLE "orders" ADD COLUMN "discount_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promo_code" text;
