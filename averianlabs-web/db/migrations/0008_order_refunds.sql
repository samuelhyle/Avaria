-- Refunds.
--
-- The admin console used to flip an order to "refunded" without moving any
-- money. These columns record how the money actually went back, so an
-- operator can see whether a refund was taken through the payment provider,
-- sent as an outbound crypto transfer, or settled by hand.
ALTER TABLE "orders" ADD COLUMN "refund_method" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_reference" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_refund_method_check" CHECK ("orders"."refund_method" IS NULL OR "orders"."refund_method" IN ('stripe', 'crypto', 'manual'));
