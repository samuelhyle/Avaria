# Phase 1 — Repository & Integration Inventory

**Date:** 11 October 2026
**Status:** Phase 1 deliverable for the AverianLabs implementation plan
**Scope:** Technical inventory only. The eligibility-and-evidence register (business data) is a separate artefact that requires the D1–D3 decisions from the plan and access to supplier records.
**Companion document:** `AverianLabs_Implementation_Plan.md`

---

## 1. Executive snapshot

| Item | Finding |
| ---- | ------- |
| Framework | Next.js 15.5.25 (App Router, RSC, Server Actions) + React 19.2.1 + TypeScript 5.7 strict |
| Styling | Tailwind v4 beta + Radix primitives + `geist` font + `motion` (Framer successor) |
| 3D | React Three Fiber + drei + postprocessing (loaded eagerly — §6 perf risk) |
| Database | Postgres 16 + pgvector via Drizzle ORM; hosted Neon (per RUNBOOK) |
| Auth | Auth.js v5 beta with DrizzleAdapter + Argon2 + Google OAuth + passkeys |
| CMS | Sanity v3 (`next-sanity` 9.12.3, `@sanity/client` 7.26.2) — blog falls back to local catalogue when empty |
| Payments (fiat) | Stripe SDK 17.5.0 (`apiVersion: "2025-02-24.acacia"`) |
| Payments (crypto) | **Coinbase Commerce** — direct REST API (no SDK), webhook handler at `/api/webhooks/coinbase`. **This contradicts the plan, which says BTCPay.** See §9. |
| Email | Resend (`RESEND_FROM_EMAIL="orders@averianlabs.eu"`) |
| Search | Meilisearch (optional) |
| Storage | Cloudflare R2 for COAs, blog media, GDPR exports |
| Shipping | Sendcloud |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Observability | Sentry (server + browser), PostHog (EU host `eu.i.posthog.com`), Vercel Analytics + Speed Insights |
| AI | MiniMax API (`api.minimax.io/v1`) for chat + embeddings; `@huggingface/transformers` as 384-dim local fallback |
| Linting | Biome 1.9 (replaces ESLint + Prettier) |
| Tests | Vitest unit + Playwright E2E + axe-core a11y smoke + Lighthouse CI |
| Package manager | pnpm 10 (lockfile present, `node-linker=isolated`) |
| Node | 22.x required (`engines.node`) |
| Build artefacts | `next.config.ts` ships two output modes — `standalone` (production / Vercel) and `output: "export"` (demo / Netlify static) |

---

## 2. Top-level layout

```
app/                      Next.js App Router
  api/                    ~50 route handlers (see §6)
  [locale]/               All locale-prefixed user routes (en, fi, de, sv, nl)
  studio/                 Sanity Studio embed (only when env vars are set)
  layout.tsx              Root layout
  sitemap.ts / robots.ts  SEO surfaces

components/               ~22 grouped folders: account, activity, admin, auth,
                                         calculator, cart, checkout, community,
                                         compare, documents, home, layout, partner,
                                         product, research-plans, search, seo,
                                         shop, support, three, ui

db/
  schema/index.ts         713 lines, ~30 tables
  schema/ai.ts            217 lines, RAG + conversation + memory + support tickets
  migrations/             1 migration + meta
  migrations-legacy/      Preserved old migrations (audit trail)
  seed.ts                 15-placeholder-SKU seed for dev

lib/
  auth/                   NextAuth config + Drizzle adapter schema
  cart/, checkout/        Zustand stores (persisted)
  payments/               Stripe singleton (lazy-init)
  products/               Static catalogue (839 lines, 15 products)
  orders/                 createOrder / webhook idempotency / refund / restore
  shipping/, vat/         Carrier + EU VIES lookup
  search/                 Meilisearch client
  i18n/                   next-intl request/config
  security/               IP, rate limit, cron guard
  ai/                     Chunking, retrieval, rate limit
  gdpr/                   Article 15/17 helpers
  documents/              COA/SDS/etc. document viewer
  storage/                R2 + recently-viewed
  seo/, og/               Metadata + OG image
  three/                  Label atlas / vial geometry for R3F
  …and ~20 more feature folders

messages/
  en.json, fi.json, de.json, sv.json, nl.json   ~790–800 lines each

sanity/                   Studio config + schemas

scripts/
  deploy-local.sh           All-in-one local stack
  build-demo.sh            Static demo build
  backup-db.sh             pg_dump wrapper
  ai-eval.ts, ai-index.ts  RAG eval + index
  search-index.ts          Meilisearch reindex
  seed-*.ts                Various seeds (blog, demo, glossary)
  a11y-smoke.mjs           axe smoke runner
```

---

## 3. Configuration surface

### Environment variables

52 distinct variables, validated by `lib/env.ts` using Zod (`serverSchema`). Required only in production (not in build phase, not in demo build). Empty values are normalised to `undefined` before validation.

| Group | Vars | Required in prod |
| ----- | ---- | ---------------- |
| Core | `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` | yes |
| Auth (Google) | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | optional |
| Cron | `CRON_SECRET` (≥16 chars) | optional |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | optional |
| Coinbase Commerce | `COINBASE_COMMERCE_API_KEY`, `COINBASE_COMMERCE_WEBHOOK_SECRET` | optional |
| Sendcloud | `SENDCLOUD_{PUBLIC,SECRET,WEBHOOK}_KEY` | optional |
| Sanity | `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_TOKEN`, `SANITY_API_READ_TOKEN`, `SANITY_WEBHOOK_SECRET` | optional |
| Cloudflare R2 | `R2_{ACCOUNT_ID,ACCESS_KEY_ID,SECRET_ACCESS_KEY,BUCKET,PUBLIC_URL,PUBLIC_BASE_URL}`, `NEXT_PUBLIC_R2_BASE_URL` | optional |
| Meilisearch | `MEILI_HOST`, `MEILI_API_KEY`, `MEILI_MASTER_KEY`, `MEILI_SEARCH_KEY` | optional |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | optional |
| Sentry | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | optional |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | optional |
| Upstash | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | optional |
| MiniMax | `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_CHAT_MODEL`, `MINIMAX_EMBEDDING_MODEL`, `MINIMAX_EMBEDDING_DIMENSIONS` | optional |
| Legal | `NEXT_PUBLIC_LEGAL_{COMPANY_NAME,BUSINESS_ID,VAT_ID,ADDRESS_LINE1,ADDRESS_LINE2,EMAIL}` | optional in dev — but `BUSINESS_ID` and `VAT_ID` are `"FI-PENDING"` placeholders (ORG-01) |
| Site | `NEXT_PUBLIC_SITE_URL`, `VERCEL_URL` | optional |

### Security headers (`next.config.ts`)

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Content-Security-Policy` — see §9.
- `Cache-Control: public, max-age=31536000, immutable` on `/_next/static/*`
- `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` on images

### Build modes

| Mode | Trigger | Output | Use |
| ---- | ------- | ------ | --- |
| Production | default | `output: "standalone"`, Sentry source-map upload if `SENTRY_AUTH_TOKEN` set, server actions enabled | Vercel (per RUNBOOK) |
| Demo | `BUILD_MODE=demo` | `output: "export"`, `trailingSlash: true`, `images.unoptimized: true`, no Sentry, no API routes | Netlify (preview / demo) |

The Netlify deployment is marked `X-Robots-Tag: noindex, nofollow` so it is **not** the canonical site. The canonical production URL is `https://averianlabs.eu` on Vercel, region `fra1` (Frankfurt).

---

## 4. Database schema (Postgres + pgvector)

`db/schema/index.ts` (713 lines) + `db/schema/ai.ts` (217 lines).

### Core commerce

| Table | Notable columns | Purpose |
| ----- | --------------- | ------- |
| `users` | `role` (default `customer`), `reputationTier`, `deletedAt` | Soft-deletable members |
| `accounts`, `sessions`, `verificationTokens`, `passkeys` | — | Auth.js DrizzleAdapter tables |
| `addresses` | `userId` nullable (guest checkout), `isDefaultBilling/Shipping` | Shipping + billing |
| `categories`, `products`, `product_translations` | `products.purityPercent`, `products.status` | Catalogue |
| `vials` | `sizeMg`, `priceCents`, `compareAtCents`, `stockQty`, `lowStockThreshold` — **no `purchaseMode` or `contactOnly` column** | SKUs |
| `order_items` | `unitPriceCents` snapshot, `batchId` FK to `batches` | Lines |
| `orders` | `subtotalCents`, `shippingCents`, `vatCents`, `totalCents`, `stripePaymentIntentId`, `cryptoChargeId`, `cryptoTxHash`, `locale` | Order header |
| `shipments` | `carrier`, `service`, `trackingNumber`, `labelUrl`, `shippedAt`, `deliveredAt` | Post-payment fulfilment |
| `batches` | `code`, `manufacturedAt`, `expiresAt`, `hplcPurity`, `endotoxinEUPerMg`, `msConfirmed`, `lab`, `coaPdfR2Key` | Released batches |
| `coa_tests` | `batchId`, `testName`, `method`, `result`, `spec`, `pass` | COA test rows |
| `documents` | `type` ∈ coa/sds/hplc/method/nmr/spec/msds, `version`, `fileR2Key`, `externalUrl` | Typed document viewer |
| `webhook_events` | `(id = "{provider}:{eventId}")` primary key, `provider` ∈ stripe/coinbase | Idempotency ledger |

### Commerce-augmenting

| Table | Purpose |
| ----- | ------- |
| `rewards_accounts`, `referral_redemptions` | Loyalty (defer per plan) |
| `partner_applications` | Institutional enquiry intake |
| `banned_countries` | Per-country blocklist |

### Community (defer per plan)

`forum_categories`, `forum_threads`, `forum_posts`, `forum_reactions`, `forum_reports`, `forum_moderation_events`.

### Research / content (defer some, fix others)

`research_plans`, `research_plan_items`, `activity_events`, `notifications`, `notification_preferences`, `audit_log`.

### GDPR + newsletter

`gdpr_requests` (export / delete with single-use `token` and `tokenExpiresAt`), `newsletter_subscribers` (double opt-in).

### AI / RAG (`db/schema/ai.ts`)

`ai_documents` → `ai_document_chunks` (pgvector `vector(384)`, tsvector generated column for BM25), `ai_conversations`, `ai_messages`, `user_memories`, `support_tickets`.

### Migrations

One migration folder (`0000_robust_rhino.sql`) plus `migrations-legacy/` containing older SQL. Drizzle `strict: true`, `verbose: true`.

---

## 5. i18n

| Locale | Status | Lines |
| ------ | ------ | ----: |
| en | source | 790 |
| fi | translated | 790 |
| de | translated | 800 |
| sv | translated | 800 |
| nl | translated | 800 |

`lib/i18n/config.ts` declares all five as supported. The plan recommends launching with only **fi + en** reviewed. de / sv / nl should remain visible but flagged as "not yet reviewed for launch" until P1 I18N-01 passes.

Locale detection: `middleware.ts` reads `accept-language`, redirects to `/<locale>/...` if missing. The middleware excludes `/api`, `/studio`, `/_vercel`, static files, and icon endpoints.

---

## 6. API routes (App Router)

`app/api/` contains 51 route handlers under `auth`, `admin`, `ai`, `checkout`, `documents`, `forum`, `gdpr`, `newsletter`, `partner`, `plans`, `referral`, `search`, `shipping`, `vat`, `review-request`, `cart-recovery`, `contact`, `webhooks/{stripe,coinbase,sanity}`.

Selected ones relevant to the plan:

| Route | What | Notes |
| ----- | ---- | ----- |
| `POST /api/checkout` | Creates order + Stripe PaymentIntent or Coinbase charge | `app/api/checkout/route.ts`, 191 lines, with rate limit (20/h per IP), schema validation, server-side price calc via `createOrder`. **No check for `contactOnly`/`purchaseMode`** (CAT-01). |
| `POST /api/webhooks/stripe` | Stripe payment events | Webhook idempotency via `webhook_events` |
| `POST /api/webhooks/coinbase` | `charge:confirmed` / `charge:failed` | HMAC SHA256 signature verify with `timingSafeEqual`, idempotency ledger, stock restore on failure |
| `POST /api/webhooks/sanity` | Reindex `glossaryTerm`/`post` | `x-sanity-secret` header check |
| `POST /api/auth/[...nextauth]` | Auth.js | Credentials + Google |
| `POST /api/auth/register` | Email registration | Argon2 hash, rate-limited |
| `POST /api/auth/forgot-password` / `reset-password` | Password reset | Token + expiry |
| `POST /api/vat` | VIES lookup proxy | Cached 24 h via `unstable_cache` |
| `GET /api/health` | Liveness + DB ping | Used by Docker `HEALTHCHECK` and Vercel |
| `GET /api/admin/audit` | Admin audit log viewer | Role-gated |
| `/api/admin/ai/*` | AI admin (metrics, conversations, draft reply) | Role-gated |
| `/api/ai/*` | Averia chat: chat, memory, identity, feedback, consent, conversations | MiniMax-backed; `provider_unavailable` 503 if key missing |

---

## 7. Build / deploy surface

| Layer | Detail |
| ----- | ------ |
| **Docker** | `Dockerfile` (3-stage: deps → builder → runner) on `node:22-bookworm-slim`, non-root runtime user, pnpm 10 cache mount, standalone output. `docker-compose.yml` runs Postgres (`pgvector/pgvector:pg16`) on `127.0.0.1:5434` and the web service on `:3000`. Healthcheck hits `/api/health`. |
| **Vercel** | Production target. `vercel.fr1` region. Build runs `pnpm db:migrate` before traffic swap; auto-rollback on migration failure. |
| **Netlify** | Preview/demo only. `@netlify/plugin-nextjs` packages Functions + Edge Functions. `X-Robots-Tag: noindex, nofollow` enforced via `netlify.toml`. |
| **Local** | `./scripts/deploy-local.sh` orchestrates Postgres, install, schema push, seed, dev/prod modes. |

There is no Helix or Hetzner deployment in the repo — the plan's "EU-hosted VPS" direction would require a new harness (compose stack already supports self-hosting).

---

## 8. CI / tests / quality

`.github/workflows/ci.yml` defines 6 jobs:

| Job | Runs on | What |
| --- | ------- | ---- |
| quality | pgvector service | install → `db:migrate` → `lint` → `typecheck` → `test` → `pnpm audit --audit-level=high` → optional `ai:eval` |
| bundle-size | — | asserts shared chunk ≤ 300 kB gzipped |
| build | — | install → `build` → `test` |
| e2e | pgvector service | install → migrate → Playwright install → build → `test:e2e` |
| a11y | — | install → Playwright install → build → start server → `test:a11y` |
| lighthouse | — | install → build → `treosh/lighthouse-ci-action@v11` with `.lighthouserc.json` thresholds |

`.lighthouserc.json` assertions (already enforced in CI):

- `categories:performance` ≥ 0.7 (warn)
- `categories:accessibility` ≥ 0.9 (error) ← plan's release criterion of 0.9 is already CI-enforced
- `categories:best-practices` ≥ 0.85 (warn)
- `categories:seo` ≥ 0.85 (warn)
- `unused-javascript` and `unused-css-rules` (warn)

Vitest config is implicit (no `vitest.config.ts` found — defaults); unit tests live under `tests/unit/` and are excluded from Playwright via `testIgnore`.

---

## 9. Plan verification and discrepancies

### P0/P1 backlog items cross-checked against code

| Plan ID | Code confirmation | Status |
| ------- | ----------------- | ------ |
| CAT-01 | AOD-9604 has `priceCents: 0` and `contactOnly: true` in **static** product data (`lib/products/data.ts:730`), but the `vials` table has **no** `contactOnly` or `purchaseMode` column. The flag is read by `app/[locale]/shop/[slug]/page.tsx` for UI display only; `lib/orders/service.ts::createOrder` accepts the SKU, computes `subtotalCents = priceCents × qty = 0`, and the Stripe / Coinbase branch creates a payable order for €0. **Real bug, plan is correct.** | confirmed |
| DATA-01 | `products.purityPercent` and `batches.hplcPurity` are independent fields; static seed has 98.7 vs 98.9 etc. exactly as the plan reports. | confirmed |
| DOC-01 | `documents` table supports COA/SDS/HPLC/METHOD/NMR/MSDS/SPEC with versioning + R2 keys; no seed data appears to be inserted. The "Ei dokumentteja" symptom likely reflects the empty seed run, not a query bug. | confirmed |
| ORG-01 | `NEXT_PUBLIC_LEGAL_BUSINESS_ID="FI-PENDING"` and `NEXT_PUBLIC_LEGAL_VAT_ID="FI-PENDING"` in `.env.example:66-67` with comment "placeholders are intentional until the real business ID and VAT ID are registered in the EU VIES". | confirmed |
| UNIT-01 | `vials.sizeMg` is typed `doublePrecision` and used for **all** SKUs, including BAC water which is a volume. Static seed uses `mg: 10` for BAC water even though the description says "10 mL". `mg` propagates into `lib/cart/store.ts` (`CartItem.mg`), the checkout email template, and product pages. | confirmed |
| USE-01 | Cannot verify the dose / syringe / weekly-schedule surfaces from this inventory alone; requires product-page review. | partial |
| CLAIM-01 | `audit_log`, `forum_moderation_events` exist; `partner_applications` table supports institutional flow; need product-page and homepage audit for unsubstantiated claims. | partial |
| I18N-01 | All five catalogues exist at ~790 lines each, but the plan's premise that "Finnish pages contain English copy" cannot be verified without runtime fallback testing. | partial |
| FORMAT-01 | `lib/utils/format.ts` exists; the `KLOW` low-stock text and doubled-percent bugs are likely in the product / shop components — need runtime inspection. | partial |
| SHIP-01 | `lib/shipping/cached.ts` and `lib/shipping/index.ts` exist; carrier transit vs dispatch promise split not visible from this layer alone. | partial |
| PAY-01 | All payment env vars optional and empty in `.env.example`. Stripe SDK is **lazy-initialised** in `lib/payments/stripe.ts` (throws if key missing at runtime). Coinbase uses direct REST. UI may still show logos — needs UI inspection. | confirmed |
| EDIT-01 | Blog content lives in Sanity; `app/[locale]/blog/` routes exist. Reading-time computation not visible in inventory. | partial |
| TYPE-01 | Shared `vials.sizeMg` template is used for BAC water. No reagent-vs-peptide discriminator in the schema. | confirmed |

### Plan discrepancies that need reconciliation

| # | Plan says | Code says | Action |
| - | --------- | --------- | ------ |
| ---- | --------- | --------- | ------ |
| **D-A** | §0 default §1, §7, §8 of the plan recommend BTCPay (with watch-only wallet, Lightning, on-chain fallback, reference to BTCPay docs) | Code uses **Coinbase Commerce** with a hosted checkout (`https://api.commerce.coinbase.com/charges`), a dedicated `/api/webhooks/coinbase` handler, HMAC SHA256 verification, and `cryptoChargeId` / `cryptoTxHash` columns on `orders` | **Update the plan** to reflect Coinbase Commerce as the live crypto provider. Decide whether to swap to BTCPay (Phase 2+ migration) or keep Coinbase Commerce. The plan's "BTCPay" references in §0 default §1, §7 (multiple), §8 and §16 must change. |
| D-B | §2 "Use an EU-hosted order backend, private PostgreSQL database" | Production target is **Vercel** (Frankfurt region) + Neon Postgres. Netlify exists only for the demo. | Reconcile: Vercel `fra1` is EU-region; document this in §2 and §9. |
| D-C | §5 calls for an `inventory_reservations` record | Schema has **none**. Stock is decremented directly on `vials.stockQty` in a transaction with `SELECT ... FOR UPDATE` (`lib/orders/service.ts:100-119`) | Acceptable for MVP: the row-level lock + conditional update is functionally equivalent to a reservation; but there is **no TTL** — a stuck checkout leaves stock decremented indefinitely. Add `inventory_reservations` table OR add a background reaper for orphaned decrements. |
| D-D | §9 says webhook idempotency via ledger + uniqueness on `(provider, eventId)` | `webhook_events.id` primary key is `"provider:eventId"` string — `onConflictDoNothing` makes it idempotent. ✓ | Aligned. |
| D-E | §7 says use nullable prices for quote-only items | Schema has `priceCents integer NOT NULL` | **Conflict**. To support CAT-01 fix, change to `numeric`/`integer NULL` OR add a separate `quotation_only` boolean on `vials`. |

### Plan items that the code already satisfies

- Atomic stock reservation with overselling guard (§11 correctness check)
- Webhook idempotency (§11)
- Per-IP and per-email rate limiting on auth and checkout (§9)
- Argon2 password hashing
- JWT sessions with 30-day max age, role hydration
- Passkey support
- Double opt-in newsletter
- GDPR export/delete requests with single-use tokens
- Documented 7-type document taxonomy
- VIES caching (24 h via `unstable_cache`)
- VAT ID validation in checkout flow
- `frame-ancestors 'self'`, `object-src 'none'`, HSTS preload
- `Cache-Control` for hashed assets and images
- `dangerouslySetInnerHTML` lint rule (warn)
- `useImportType` rule (error) prevents value-as-type imports
- Bundle-size CI guard (≤ 300 kB shared chunk)
- Lighthouse a11y ≥ 0.9 enforced
- `pnpm audit --audit-level=high` enforced in CI

---

## 10. Risks surfaced by the inventory (additive to the plan's §14)

| ID | Risk | Source | Recommendation |
| -- | ---- | ------ | -------------- |
| INV-1 | `vials.stockQty` is decremented on order creation with **no TTL** on the reservation. A stuck Stripe redirect holds stock indefinitely. | `lib/orders/service.ts:111-119` | Add a `reserved_until` column on `vials` (or a dedicated `inventory_reservations` table) and a cron reaper that releases expired holds. |
| INV-2 | `orders` table has **no `currency` per line** — only a single header currency. Mixing currencies in one order would silently convert. | `db/schema/index.ts:222` | Acceptable for now (EUR-only) but document; add a `currency` column on `order_items` before enabling non-EUR SKUs. |
| INV-3 | Coinbase Commerce requires customers to fund a hosted page; the plan's payment-state-machine rows (pending / detected / confirmed / underpayment / expired / late / duplicate / outage / refund) are partially handled — Coinbase emits `charge:confirmed` and `charge:failed`, but **no `charge:detected` or underpayment handler exists**. | `app/api/webhooks/coinbase/route.ts:66-83` | Add an explicit "detected but not confirmed" UI state and an underpayment recovery flow. |
| INV-4 | BTCPay plan vs Coinbase code discrepancy (D-A above) creates risk that the plan's BTCPay-specific guidance (watch-only wallet, address derivation verification, Lightning vs on-chain decision matrix) is irrelevant if the chosen path stays Coinbase. | Plan §7 + repo | Pick a side in week 0; do not maintain two crypto designs in parallel. |
| INV-5 | `next-intl` 4 is in beta (`^4.0.0-beta.10`). Breaking changes possible between minor releases. | `package.json:61` | Pin to a specific beta or upgrade path before launch. |
| INV-6 | `@huggingface/transformers` is a 100+ MB dependency for the local embedding fallback. Confirm it's tree-shaken from the Function bundle; otherwise bloat. | `package.json:34` | Inspect Vercel function bundle; document if cold-start cost is acceptable. |
| INV-7 | R3F (Three.js) loads eagerly; plan §6 wants lazy load + reduced-motion respect. | `package.json:37-39, 65, 75` | Audit the 3D viewer mount points and gate behind interaction. |
| INV-8 | The `account` locale set in `users.locale` defaults to `en` regardless of where the user actually signed up. Combined with the `prefer-frozen-lockfile` pnpm setting and `localeCurrencies[sv] = "SEK"`, a Swedish user could be charged in SEK by accident. | `db/schema/index.ts:24`, `lib/i18n/config.ts:36-42` | Force `currency = "EUR"` for orders (already done in `createOrder`); ensure UI never reads `localeCurrencies` for checkout. |
| INV-9 | `vials.lowStockThreshold` is per-SKU but **not surfaced in the schema's TypeScript type** as `>= 0`. The static seed uses `0` for AOD-9604, which would trigger "low stock" UX on every page render. | `db/schema/index.ts:173`, `lib/products/data.ts:730` | Either default `lowStockThreshold` to `null` for quote-only items, or treat `0` as "do not display". |

---

## 11. Phase 2 readiness checklist

For the next workstream (catalogue, units, purchase modes, batches, documents), these decisions / inputs are needed:

- [ ] **Resolve D-A (BTCPay vs Coinbase Commerce).** Either swap to BTCPay (requires new code, infra, custody) or keep Coinbase Commerce and rewrite §7 / §8 of the plan to match.
- [ ] **Schema migration for `vials.purchaseMode`** (`direct | quotation | unavailable`). Default existing rows to `direct` except AOD-9604 (`quotation`). `priceCents` becomes nullable for `quotation`. Reject inserts/updates where `priceCents IS NULL AND purchaseMode = 'direct'`.
- [ ] **Schema migration to disambiguate Mass / Volume / Count.** Options: (a) split `sizeMg` into `sizeValue numeric + sizeUnit text CHECK (sizeUnit IN ('mg','g','mcg','mL','uL','vial'))`, (b) add a separate `reagentSpec` JSONB column for non-peptide SKUs.
- [ ] **Link `batches` purity to rendered product page** — `product_pages` must query `batches.hplcPurity` for the active batch, not `products.purityPercent`. Add a `useBatchPurity` query helper and migrate all product-page renderers.
- [ ] **Document seeding plan** — minimum one COA per saleable batch with R2 key + signed-URL preview, otherwise `documents` page continues to render "no documents".
- [ ] **ORG-01 inputs** — real `NEXT_PUBLIC_LEGAL_BUSINESS_ID`, `NEXT_PUBLIC_LEGAL_VAT_ID`, address fields. Without these the footer carries `"FI-PENDING"` placeholders.
- [ ] **Reconciliation between product-page purity (`purityPercent`) and COA registry (`batches.hplcPurity`)** — three concrete examples are already in §3 of the plan (RETA / GHK / BPC).

---

## 12. What is not yet covered

The plan's other items remain open until Phase 2 / 3:

- Eligibility and evidence register (business data — needs D7 in the plan's decision register)
- Quotation flow UI / quotation-request record
- VAT / B2B eligibility gate before order creation
- Refund flow (`markOrderRefunded` exists but no Stripe or Coinbase API call to issue the refund)
- Backup / restore runbook (Neon PITR is in RUNBOOK; per-row document versioning does not yet have a documented cadence)
- Rollback runbook as a deliverable (referenced in §9 of the plan, not yet authored)
- Per-locale SEO lint, META-01, PERF-01

---

End of Phase 1 inventory. The next deliverable in this directory should be `PHASE2_CATALOGUE_DESIGN.md` once D-A and the schema migration questions above are answered.