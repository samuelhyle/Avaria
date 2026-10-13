# Phase 2 — Catalogue, Batches and Documents Design

**Date:** 11 October 2026
**Status:** Phase 2 design deliverable
**Companion documents:** `AverianLabs_Implementation_Plan.md` §5, `PHASE1_INVENTORY.md`
**Pre-decision:** Payment mix is **Stripe + Coinbase Commerce** (D2 resolved as *hybrid*; BTCPay deferred to post-launch).

This document is the design that Workstream B in the plan calls out. It specifies the schema migrations, service-layer changes, render changes and seed work needed to close CAT-01, DATA-01, DOC-01, ORG-01, UNIT-01 and TYPE-01, plus the inventory-reservation gap raised by INV-1.

It is a design, not a deployment plan. Migration files and code changes are issued as a second wave after this design is reviewed.

---

## 1. Scope

| Plan ID | Bug | Fixed by |
| ------- | --- | -------- |
| CAT-01 | €0 / sticky-buy AOD-9604 | §2.1 `vials.purchaseMode` |
| DATA-01 | Purity mismatch between product page and COA registry | §2.3 `products.activeBatchId` + page render |
| DOC-01 | Empty Documents page | §3 document pipeline + seed |
| ORG-01 | `FI-PENDING` placeholders in footer | §5 footer + env inputs |
| UNIT-01 | BAC water shown as 10 mg instead of 10 mL | §2.2 typed units |
| TYPE-01 | Peptide template applied to BAC water | §6 type-specific schemas |
| INV-1 | Stock decrement with no TTL | §2.4 inventory reservations |
| INV-9 | `lowStockThreshold: 0` triggers "low stock" on every render of a quote-only item | §2.5 nullable threshold |

## 2. Schema changes

All changes go through `drizzle-kit generate` → manual review → migration file under `db/migrations/`. Migrations are written in **forward-only** style; down-scripts are kept under `db/migrations/down/` for emergency rollback but never run automatically.

### 2.1 `vials.purchaseMode` (CAT-01)

```sql
ALTER TABLE vials
  ADD COLUMN purchase_mode text NOT NULL DEFAULT 'direct'
    CHECK (purchase_mode IN ('direct', 'quotation', 'unavailable'));

ALTER TABLE vials
  ALTER COLUMN price_cents DROP NOT NULL;

ALTER TABLE vials
  ADD CONSTRAINT vials_purchase_mode_price_check
  CHECK (
    (purchase_mode = 'quotation' AND price_cents IS NULL)
    OR (purchase_mode IN ('direct', 'unavailable'))
  );

CREATE INDEX vials_purchase_mode_idx ON vials (purchase_mode);

UPDATE vials SET purchase_mode = 'quotation', price_cents = NULL
  WHERE sku IN ('AOD-5');
```

**Seed data migration:**

- AOD-9604 (sku `AOD-5`) → `purchase_mode = 'quotation'`, `price_cents = NULL`.
- All other vials → `purchase_mode = 'direct'` (default).
- Future SKUs in `unavailable` mode (e.g. withdrawn batches) → `price_cents = NULL`, `purchase_mode = 'unavailable'`.

### 2.2 Typed units (UNIT-01)

Replace `size_mg` with a value + unit pair. Decision: keep the column name stable in the API layer by adding new columns rather than renaming, to avoid breaking every consumer at once.

```sql
ALTER TABLE vials
  ADD COLUMN size_value numeric,
  ADD COLUMN size_unit text
    CHECK (size_unit IN ('mg', 'g', 'mcg', 'mL', 'uL', 'vial'));

-- Backfill: every existing row assumes mass unless we know better.
UPDATE vials SET
  size_value = size_mg,
  size_unit = 'mg'
WHERE size_value IS NULL;

-- BAC water is a volume: 10 mL
UPDATE vials SET
  size_value = 10,
  size_unit = 'mL'
WHERE sku = 'BACW-10';

-- Make size_value NOT NULL after backfill
ALTER TABLE vials
  ALTER COLUMN size_value SET NOT NULL,
  ALTER COLUMN size_unit SET NOT NULL;

-- Drop the old column only after all consumers are migrated.
-- ALTER TABLE vials DROP COLUMN size_mg;
```

**Drop decision:** leave `size_mg` for one release, then drop. Static product data in `lib/products/data.ts` already declares `mg: 10` for BAC water — that file becomes redundant once DB-driven UI lands.

### 2.3 Active batch linkage (DATA-01)

```sql
ALTER TABLE products
  ADD COLUMN active_batch_id text
    REFERENCES batches(id) ON DELETE SET NULL;

CREATE INDEX products_active_batch_idx ON products (active_batch_id);

-- A product's visible purity is the active batch's hplcPurity.
-- Do NOT display products.purityPercent on the storefront.
```

**Rule:** if `active_batch_id IS NULL`, the product is not saleable (no test result available). The query helper `getProductWithBatch(slug)` joins `products → batches` and exposes `purityPercent` (from batch) and `purityFallback` (from product, used only for non-buyable displays).

### 2.4 Inventory reservations (INV-1)

```sql
CREATE TABLE inventory_reservations (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vial_id text NOT NULL REFERENCES vials(id) ON DELETE CASCADE,
  qty integer NOT NULL CHECK (qty > 0),
  expires_at timestamp with time zone NOT NULL,
  released_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX inventory_reservations_vial_idx
  ON inventory_reservations (vial_id, released_at);

CREATE INDEX inventory_reservations_expires_idx
  ON inventory_reservations (expires_at)
  WHERE released_at IS NULL;
```

**Behaviour:** `createOrder()` inserts a reservation row with `expires_at = now() + interval '15 minutes'`. The webhook handlers (`charge:confirmed`, Stripe `payment_intent.succeeded`) and the explicit `markOrderFailed` path both flip `released_at = now()`. A reaper job (cron) calls `releaseExpiredReservations()` every 5 minutes and frees stuck holds.

This replaces the current "decrement at order time, restore on failure" pattern with a TTL-aware reservation. The `vials.stockQty` column remains authoritative for inventory reporting; reservations subtract from "buyable now" but not from "physical on hand".

### 2.5 Nullable low-stock threshold (INV-9)

```sql
ALTER TABLE vials
  ALTER COLUMN low_stock_threshold DROP NOT NULL;
```

**UI rule:** if `low_stock_threshold IS NULL` or `purchase_mode != 'direct'`, suppress the "low stock" badge.

### 2.6 `orders` and crypto fields

```sql
ALTER TABLE orders
  ADD COLUMN currency_per_line text NOT NULL DEFAULT 'EUR',
  ADD COLUMN invoice_url text,
  ADD COLUMN payment_provider_fee_cents integer,
  ADD COLUMN exchange_rate_eur_per_unit numeric;
```

- `currency_per_line` is a guardrail; orders stay EUR-only for now but the column defends against accidental multi-currency orders (INV-2).
- `invoice_url` carries the Coinbase hosted page URL for retrieval / receipts.
- `payment_provider_fee_cents` and `exchange_rate_eur_per_unit` are populated at confirmation time for accounting reconciliation (§10 of the plan).

### 2.7 `documents` improvements

```sql
ALTER TABLE documents
  ADD COLUMN requires_login boolean NOT NULL DEFAULT false,
  ADD COLUMN display_locales text[] NOT NULL DEFAULT ARRAY['en','fi','de','sv','nl']::text[],
  ADD COLUMN signed_url_expires_at timestamp with time zone;

CREATE INDEX documents_display_locales_idx
  ON documents USING gin (display_locales);
```

`display_locales` lets the plan's "launch with FI + EN reviewed" rule hide unsupported-locale document entries without deleting them.

## 3. Service-layer changes

### 3.1 Cart store (`lib/cart/store.ts`)

```ts
export interface CartItem {
  productSlug: string
  sku: string
  name: string
  sizeValue: number
  sizeUnit: 'mg' | 'g' | 'mcg' | 'mL' | 'uL' | 'vial'
  qty: number
  unitPriceCents: number | null  // null = quotation
  purchaseMode: 'direct' | 'quotation' | 'unavailable'
}
```

- `add()` accepts items with `purchaseMode = 'quotation'` (renders "Contact for quote" badge) but **`clear()` or `checkout()` rejects any cart containing quotation or unavailable items**.
- `subtotal()` excludes non-buyable items and surfaces them in a separate `quoteItems` slice.

### 3.2 Checkout API (`app/api/checkout/route.ts`)

Add these guards before `createOrder()`:

1. Reject any item whose server-side `purchaseMode` is not `direct` (returns `409` with `error: "quote_required"`).
2. Reject any item whose server-side `priceCents` is null while `purchaseMode = 'direct'` (data integrity guardrail; should never happen with the §2.1 CHECK in place).
3. Reject any item whose server-side `activeBatchId` is null (DATA-01; product is not saleable).
4. Compute all prices server-side from the joined view; ignore client-supplied prices entirely.
5. Compute VAT server-side; if `vatId` is provided and `validateVatId()` returns `valid`, set `b2b: true` and zero VAT (D1-dependent).
6. Reserve inventory through `inventory_reservations` (TTL 15 min).

The Stripe PaymentIntent and Coinbase Commerce charge paths already exist; they need no logic change beyond passing through the new fields.

### 3.3 Orders service (`lib/orders/service.ts`)

```ts
export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  return db.transaction(async (tx) => {
    // ... existing selection + stock check ...

    // NEW: write inventory_reservations
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    await tx.insert(inventoryReservations).values(
      orderItemRows.map((r) => ({
        orderId: order.id,
        vialId: r.vialId,
        qty: r.qty,
        expiresAt,
      })),
    )

    // ... existing order creation ...
  })
}
```

- `markOrderPaid` flips `inventory_reservations.released_at` for that order (the stock decrement stays as the source of truth for "physical inventory").
- `markOrderFailed` does the same on the failure path.
- New `releaseExpiredReservations()` runs from cron every 5 min: `UPDATE inventory_reservations SET released_at = now() WHERE released_at IS NULL AND expires_at < now()`. Idempotent.

### 3.4 Product page renderer (`app/[locale]/shop/[slug]/page.tsx`)

- Remove the `contactOnly` flag check (now redundant with `purchaseMode`).
- Render vials from DB; static data in `lib/products/data.ts` becomes a fallback for the demo build only.
- Read `purityPercent` from `batches.hplcPurity` via `products.activeBatchId` join.
- Read `sizeValue` / `sizeUnit` instead of `mg`.
- Add an "active batch" badge that links to the COA registry.
- Suppress "low stock" badge when `purchaseMode != 'direct'` or `lowStockThreshold IS NULL`.

### 3.5 Cart drawer / listing

- For each line, render unit (`mg` / `mL` / etc.) next to the quantity.
- Render "Contact for quote" CTA in place of "Add to cart" for `quotation` items.
- Render the SKU; cart drawer is **not** a place to hide the SKU from the public.

## 4. Document pipeline

### 4.1 Seed minimum

For every released batch with `purchaseMode = 'direct'`:

1. One `coa` document pointing to an R2 object with a real PDF.
2. The PDF must include the original laboratory report, not a re-typed summary.
3. The `version` field starts at `1.0`; subsequent re-issues bump it.

For `quotation` products, no documents are required at the listing level. If they exist (e.g. for institutional enquiries), they appear on the product page, not in the public documents index.

### 4.2 Internal upload tool

`/admin/documents` already exists in `app/[locale]/admin/`. Add a minimal uploader:

- File selection → SHA-256 checksum computed client-side → upload to a presigned R2 PUT URL → insert `documents` row.
- Reject uploads larger than 25 MB.
- Accept only `application/pdf`.
- Display the existing 7-type taxonomy; default to `coa`.

### 4.3 Customer flow

- `/[locale]/documents` lists documents filtered by `display_locales` and the current locale.
- Signed URLs are issued server-side with a 15-minute expiry.
- `requires_login` documents render a "Sign in to view" CTA in place of the download link.

## 5. ORG-01 inputs and footer change

### 5.1 Inputs (D6 from the plan's decision register)

The plan's D6 must be resolved before Phase 2 ships:

| Env var | Current | Required |
| ------- | ------- | -------- |
| `NEXT_PUBLIC_LEGAL_COMPANY_NAME` | `"AverianLabs Oy"` | real name |
| `NEXT_PUBLIC_LEGAL_BUSINESS_ID` | `"FI-PENDING"` | real Business ID from PRH |
| `NEXT_PUBLIC_LEGAL_VAT_ID` | `"FI-PENDING"` | real VAT ID registered in VIES |
| `NEXT_PUBLIC_LEGAL_ADDRESS_LINE1` | `"Address pending"` | real street address |
| `NEXT_PUBLIC_LEGAL_ADDRESS_LINE2` | `"Helsinki, Finland"` | real postal code + city |
| `NEXT_PUBLIC_LEGAL_EMAIL` | `"hello@averianlabs.eu"` | real monitored inbox |

### 5.2 CI guard

Add a CI step that fails the build if any `NEXT_PUBLIC_LEGAL_*` value is `"FI-PENDING"`. This prevents the placeholder from leaking back into a deploy after a copy/paste.

### 5.3 Footer rendering

`components/layout/footer.tsx` reads the env vars. No template change required, but the CI guard in §5.2 makes the absence of real values a build failure rather than a silent visual bug.

## 6. Type-specific schemas (TYPE-01)

### 6.1 Discriminator

```sql
ALTER TABLE products
  ADD COLUMN product_type text NOT NULL DEFAULT 'peptide'
    CHECK (product_type IN ('peptide', 'reagent', 'cosmetic', 'supplies'));
```

Seed values for the 15 SKUs:

| Slug | Type |
| ---- | ---- |
| `bac-water` | `supplies` |
| `retatrutide` | `peptide` |
| `ghk-cu` | `cosmetic` |
| `mots-c` | `peptide` |
| `melanotan-ii` | `peptide` |
| `nad-plus` | `peptide` |
| `bpc-157` | `peptide` |
| `melanotan-i` | `peptide` |
| `klow` | `peptide` |
| `bpc-tb-blend` | `peptide` |
| `selank` | `peptide` |
| `semax` | `peptide` |
| `cjc-1295` | `peptide` |
| `aod-9604` | `peptide` |
| `hgh-frag-176-191` | `peptide` |

`ghk-cu` is `cosmetic` because the description frames it as "dermal & tissue-recovery research" — verify with the scientific/quality reviewer before launch. `klow` and `bpc-tb-blend` may need a `blend` type instead of `peptide`; decide when D7 (supplier evidence) is in.

### 6.2 Per-type spec JSONB

```sql
ALTER TABLE products
  ADD COLUMN spec_json jsonb NOT NULL DEFAULT '{}'::jsonb;
```

Zod schemas per type live in `lib/products/specs/`:

- `peptide.ts` — sequence, molecular formula, molecular weight, purity, storage
- `cosmetic.ts` — peptide fields + `dermal_research_only: boolean`
- `reagent.ts` — sterility test result, endotoxin limit, packaging
- `supplies.ts` — composition (e.g. "0.9% benzyl alcohol in water"), packaging volume, storage

Validation: every product page render runs the type-specific Zod schema on `spec_json` and surfaces a quality-review banner if validation fails.

### 6.3 UI rendering

- `peptide` and `cosmetic` share the existing peptide template.
- `supplies` (BAC water) renders a reagent template: no sequence, no molecular formula, focuses on composition, sterility, endotoxin.
- The "compute dose" widget is **hidden** for `supplies` and `reagent` (reconciles USE-01 in part — the calculator was the symptom the plan called out).

## 7. Migration files

| File | Purpose |
| ---- | ------- |
| `0001_purchase_mode_and_pricing.sql` | §2.1 |
| `0002_typed_units.sql` | §2.2 |
| `0003_active_batch_link.sql` | §2.3 |
| `0004_inventory_reservations.sql` | §2.4 |
| `0005_low_stock_threshold_nullable.sql` | §2.5 |
| `0006_orders_currency_and_fees.sql` | §2.6 |
| `0007_documents_signed_url.sql` | §2.7 |
| `0008_products_product_type.sql` | §6.1 |
| `0009_products_spec_json.sql` | §6.2 |

Each migration is forward-only. Down-scripts in `db/migrations/down/` document the reverse operation but are not wired to a runner. Emergency rollback procedure is in the Phase 5 rollback runbook (§9 of the plan).

## 8. Acceptance criteria for Phase 2

The §5 gate from the plan is met when:

- [ ] No vial with `purchaseMode = 'quotation'` can appear in a paid order, regardless of UI path.
- [ ] No vial with `purchaseMode = 'unavailable'` is reachable from any public route.
- [ ] Every product page displays the active batch's `hplcPurity` (not `products.purityPercent`).
- [ ] Every product page displays the correct `sizeValue` + `sizeUnit`.
- [ ] `/[locale]/documents` shows at least one document per released batch.
- [ ] Inventory reservations expire after 15 minutes; the cron reaper frees them.
- [ ] The footer shows real company details; CI fails the build on any placeholder.
- [ ] The peptide calculator is hidden for `supplies` and `reagent` types.

## 9. Effort and sequencing

Estimated effort: **5–8 working days**, slightly above the plan's 4–7 day estimate for Workstream B, because the schema migrations (especially typed units and inventory reservations) extend the surface area.

| Day | Focus |
| --: | ----- |
| 1 | §2.1 + §2.5 + §2.7 migrations; AOD-9604 row update; CI guard for `FI-PENDING` |
| 2 | §2.2 migration; cart store update; checkout renderer update |
| 3 | §2.3 migration; product page renderer; active-batch badge |
| 4 | §2.4 migration; orders service update; cron reaper |
| 5 | §6 product_type + spec_json migration; per-type Zod schemas; calculator hiding |
| 6 | Document seed (at least one COA per released batch) |
| 7 | Internal upload tool; signed-URL flow |
| 8 | Cross-cutting tests (Vitest unit + Playwright E2E for the new rejection paths) |

## 10. Phase 3 readiness

When §8 passes:

- Phase 3 (checkout, payment events, portal, receipts, fulfilment) can start; §3.2 in this document already sketches the necessary guards.
- ORG-01 closes once D6 inputs are present and the CI guard is live.
- DATA-01 closes once every product has an `activeBatchId`.
- UNIT-01 closes once BAC water renders as 10 mL everywhere.
- CAT-01 closes once quotation SKUs are structurally unreachable from checkout.
- DOC-01 closes once at least one COA exists per released batch.

Remaining open after Phase 2: USE-01 (intended-use review, scientific/quality owner), CLAIM-01 (claim register, product owner), and any new P1s surfaced during the work.

---

End of Phase 2 design. Next deliverable in this directory: `PHASE3_CHECKOUT_RECEIPTS.md` once §3.2 and §3.3 land.