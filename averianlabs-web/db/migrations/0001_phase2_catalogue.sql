-- 0001_phase2_catalogue.sql
--
-- Phase 2 catalogue repair. Closes CAT-01, DATA-01, DOC-01 partial, ORG-01 partial,
-- UNIT-01, TYPE-01 in code; addresses INV-1 (TTL reservations), INV-2 (currency
-- guardrail), INV-9 (nullable low-stock threshold).
--
-- Companion document: PHASE2_CATALOGUE_DESIGN.md
-- This migration is forward-only. Down-scripts are kept under db/migrations/down/.

-- ============================================================================
-- 1. vials: purchase mode, typed units, nullable price, nullable threshold
-- ============================================================================

--> statement-breakpoint
ALTER TABLE "vials" ADD COLUMN "purchase_mode" text DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "vials" ADD COLUMN "size_value" double precision;--> statement-breakpoint
ALTER TABLE "vials" ADD COLUMN "size_unit" text;--> statement-breakpoint
ALTER TABLE "vials" ALTER COLUMN "price_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vials" ALTER COLUMN "low_stock_threshold" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vials" ALTER COLUMN "size_mg" DROP NOT NULL;--> statement-breakpoint

-- Backfill typed units from the legacy size_mg column.
UPDATE "vials"
  SET "size_value" = "size_mg",
      "size_unit"  = 'mg'
  WHERE "size_value" IS NULL;--> statement-breakpoint

-- BAC water is a 10 mL volume, not a 10 mg mass.
UPDATE "vials"
  SET "size_value" = 10,
      "size_unit"  = 'mL'
  WHERE "sku" = 'BACW-10';--> statement-breakpoint

-- Enforce typed units NOT NULL after backfill.
ALTER TABLE "vials" ALTER COLUMN "size_value" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vials" ALTER COLUMN "size_unit" SET NOT NULL;--> statement-breakpoint

-- AOD-9604 is the only quote-only vial in the current catalogue. Setting
-- purchase_mode='quotation' requires price_cents to be NULL (enforced below).
UPDATE "vials"
  SET "purchase_mode" = 'quotation',
      "price_cents"   = NULL,
      "low_stock_threshold" = NULL
  WHERE "sku" = 'AOD-5';--> statement-breakpoint

CREATE INDEX "vials_purchase_mode_idx" ON "vials" ("purchase_mode");--> statement-breakpoint

ALTER TABLE "vials" ADD CONSTRAINT "vials_purchase_mode_check"
  CHECK ("purchase_mode" IN ('direct', 'quotation', 'unavailable'));--> statement-breakpoint
ALTER TABLE "vials" ADD CONSTRAINT "vials_size_unit_check"
  CHECK ("size_unit" IN ('mg', 'g', 'mcg', 'mL', 'uL', 'vial'));--> statement-breakpoint
ALTER TABLE "vials" ADD CONSTRAINT "vials_purchase_mode_price_check"
  CHECK (
    ("purchase_mode" = 'quotation' AND "price_cents" IS NULL)
    OR ("purchase_mode" IN ('direct', 'unavailable'))
  );--> statement-breakpoint

-- ============================================================================
-- 2. products: active batch linkage, product_type discriminator, spec_json
-- ============================================================================

--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "active_batch_id" text REFERENCES "batches"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" text DEFAULT 'peptide' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "spec_json" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint

CREATE INDEX "products_active_batch_idx" ON "products" ("active_batch_id");--> statement-breakpoint
CREATE INDEX "products_product_type_idx" ON "products" ("product_type");--> statement-breakpoint

ALTER TABLE "products" ADD CONSTRAINT "products_product_type_check"
  CHECK ("product_type" IN ('peptide', 'cosmetic', 'reagent', 'supplies'));--> statement-breakpoint

-- Type backfill: BAC water is supplies, GHK-Cu is cosmetic (verify with
-- scientific/quality owner before launch), everything else is peptide.
UPDATE "products" SET "product_type" = 'supplies' WHERE "slug" = 'bac-water';--> statement-breakpoint
UPDATE "products" SET "product_type" = 'cosmetic' WHERE "slug" = 'ghk-cu';--> statement-breakpoint

-- Link every product to its latest released batch (the static seed has one
-- batch per product). This makes the product page render batch.hplcPurity
-- rather than products.purityPercent (DATA-01).
UPDATE "products" p
  SET "active_batch_id" = b."id"
  FROM "batches" b
  JOIN "vials" v ON v."id" = b."vial_id"
  WHERE v."product_id" = p."id"
    AND p."active_batch_id" IS NULL;--> statement-breakpoint

-- ============================================================================
-- 3. orders: currency guardrail, fee + rate fields, hosted invoice URL
-- ============================================================================

--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "currency_per_line" text DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_provider_fee_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "exchange_rate_eur_per_unit" double precision;--> statement-breakpoint

-- ============================================================================
-- 4. documents: per-locale visibility, login gate, signed-URL expiry
-- ============================================================================

--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "display_locales" text[] DEFAULT ARRAY['en','fi','de','sv','nl']::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "requires_login" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "signed_url_expires_at" timestamp with time zone;--> statement-breakpoint

-- ============================================================================
-- 5. inventory_reservations: TTL-aware stock holds (INV-1)
-- ============================================================================

--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "vial_id" text NOT NULL REFERENCES "vials"("id") ON DELETE CASCADE,
  "qty" integer NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "released_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_reservations_qty_positive" CHECK ("qty" > 0)
);--> statement-breakpoint
CREATE INDEX "inventory_reservations_vial_idx" ON "inventory_reservations" ("vial_id", "released_at");--> statement-breakpoint
CREATE INDEX "inventory_reservations_expires_idx" ON "inventory_reservations" ("expires_at") WHERE "released_at" IS NULL;