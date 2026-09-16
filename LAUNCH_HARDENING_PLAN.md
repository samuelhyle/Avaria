# AverianLabs — Launch Hardening Plan
## Performance, efficiency, stability, security & production readiness

> Companion to `PLAN.md`, `FORWARD_PLAN.md`, `EXPERIENCE_FOUNDATION_PLAN.md` and `NEXT_PHASE_PLAN.md`. This document is the result of three parallel code-level audits (performance, security, stability/launch-readiness) of `averianlabs-web/` on 2026-09-14. All file references are relative to `averianlabs-web/`.
>
> **Priority legend:** `P0` = launch blocker, do first · `P1` = must-fix before public traffic · `P2` = post-launch polish.
>
> **Scope split:** `EXPERIENCE_FOUNDATION_PLAN.md` owns design/UX/accessibility work. This plan owns performance, security, reliability, and the operational path to launch. Where a visual/UX defect is a legal or money-risk blocker, it is listed here too.

---

## 0. TL;DR

**The storefront looks done. The transactional core is not safe to take money yet.**

Three classes of launch blockers exist today:

1. **Security fail-opens** — NextAuth `handlers` is never mounted (no `/api/auth/*`, no signup, no password reset), cron endpoints authenticate against the string `"Bearer undefined"` when `CRON_SECRET` is unset, the shipped `docker-compose.yml` contains a known fallback `AUTH_SECRET`, and production dependencies carry 8 critical / 32 high advisories (including critical Next.js and next-auth CVEs).
2. **Order integrity** — shipping addresses are collected but never persisted (paid orders are unfulfillable), `userId` is never attached to orders, shipping price is client-controlled, checkout is non-transactional with no stock reservation, and Stripe webhooks are non-idempotent (retries double-decrement stock and re-send email).
3. **Operations** — the database cannot be rebuilt from migrations (large schema drift), the project is not a git repository, CI's build job cannot succeed, there is no health endpoint, no backups, no env validation, and Sentry is effectively disabled by an env-var name mismatch.

Performance is decent but two templates (PDP, `/shop`) ship the entire three.js stack by default, the product page's ISR is silently killed by `auth()`, and every page serializes the full catalog + full message bundle into the RSC payload. None of it is catastrophic — all of it is fixable in a focused hardening sprint.

| Phase | Theme | Effort | Blocks launch? |
|---|---|---|---|
| **0** | Stop the bleeding — security & legal P0s | 5–7 d | Yes |
| **1** | Money path integrity — checkout, orders, webhooks | 4–6 d | Yes |
| **2** | Security hardening — authz, rate limits, CSP, deps | 4–6 d | Yes |
| **3** | Performance & speed — rendering, payload, 3D, queries | 5–7 d | No (but ship-blocking for conversion) |
| **4** | Stability & observability — env, Sentry, DB, deploy | 3–4 d | Yes for self-host; partial for Vercel |
| **5** | Launch readiness — git/CI, tests, content, legal, QA | 3–5 d | Yes |

**Total: 24–35 focused days** (≈5–7 working weeks for one senior full-stack engineer, faster with parallel workstreams).

---

## 1. Decisions needed before execution starts

These change the shape of Phases 1–4. Resolve them in a single kickoff session.

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | **Hosting** | Vercel + Neon vs Docker on a VPS (Hetzner/Fly) | Vercel + Neon for launch (edge caching, cron, Sentry integration); keep Dockerfile working for portability. This plan assumes Vercel unless stated. |
| D2 | **Accounts at launch** | (a) Guest checkout only, (b) mount auth + build signup/reset, (c) mount auth + reuse community identity only | (b) — community already exists and assumes sessions; shipping a store with no login makes `/account/*`, plans, notifications and reputation dead weight. Requires NextAuth mount **plus** signup + password reset (neither exists today). |
| D3 | **Crypto checkout** | (a) Fix Coinbase end-to-end, (b) remove the option and hide the footer badge | (b) for launch; (a) is a 2–3 d project on its own. |
| D4 | **Reviews & testimonials** | (a) Real review system with purchase verification, (b) remove all fabricated content until (a) ships | (b) immediately — fake "verified" reviews are prohibited under EU UCPD/Omnibus rules (P0-6). |
| D5 | **VAT** | (a) Stripe Tax, (b) in-house OSS rates in `lib/vat` | (a) — Finland's general rate is 25.5% since Sep 2024, the code hardcodes 24%, and the legal pages already promise OSS/reverse-charge behavior. |
| D6 | **Locale scope at launch** | All 5 locales vs EN+FI only | EN+FI only; hide DE/NL/SV behind a feature flag until translation parity exists (`de/nl/sv` have ~299 of 457 keys). |

---

## 2. Phase 0 — Stop the bleeding (P0, 5–7 days)

> **Status (2026-09-14): executed and verified.** Auth is mounted with register/login/logout/password-reset/email-verification (end-to-end tested against Postgres); `lib/env.ts` validates env at runtime; cron routes fail closed with timing-safe compare; GDPR delete/export fixed and sanitized; fabricated reviews/testimonials/Trustpilot claims removed; newsletter is double opt-in and contact creates real support tickets; deps upgraded (Next 15.5.25, next-auth 5.0.0-beta.32, drizzle-orm 0.45.2, drizzle-kit 0.31.10, postcss pinned via override); `pnpm audit --prod` reports **0 vulnerabilities**. Remaining operational dependency: `AUTH_URL` is now **required in production** (see deploy docs), and CI/build env provisioning is tracked in Phase 4.

Security, legal, and data-loss issues that make launch negligent. Each item is PR-sized.

### 0.1 Mount and harden auth — or accounts don't exist at all
- [ ] **There is no auth route.** `lib/auth/index.ts:26` exports `handlers`, but `app/api/auth/[...nextauth]/route.ts` does not exist (verified: no `app/api/auth/` directory). Re-export `handlers as GET/POST` and verify every endpoint (`/api/auth/session|csrf|callback|signin|signout`).
- [ ] **No signup and no password reset exist anywhere** (grep-verified). Build `/[locale]/register`, `/[locale]/forgot-password`, reset-token table + emails, using Argon2 (`lib/auth/index.ts:4,50` already uses it; **do not** use `bcryptjs` — it is an unused dependency, remove it).
- [ ] **Explicit auth config** in `lib/auth/index.ts`: `secret` from validated env, `trustHost: false` with explicit `AUTH_URL` (currently defaults to trusted Host header when `AUTH_URL` is set — `@auth/core` behavior), cookie flags (`httpOnly`, `secure`, `sameSite: "lax"`), `session.maxAge` ≤ 30 d (default is 30 d), and an explicit `redirect` callback allowlist (no open redirects).
- [ ] **Replace the in-memory login limiter** (`lib/auth/index.ts:10-24`) with Upstash sliding window keyed on `ip + email`; current version is per-instance, unpruned (memory growth), and enables trivial account lockout (correct password rejected after 5 failures).
- [ ] **Fix sign-out path**: `components/admin/admin-shell.tsx:108` points at `/api/auth/signout`, which 404s until this lands.
- [ ] **Registration abuse**: rate-limit, email-verification token, and disposable-domain/banned-country check (`BANNED_COUNTRIES` is currently dead config — wire or delete).
- **Acceptance:** fresh browser can register, verify email, log in, reset password, log out, and see a session in `/api/auth/session`; Playwright smoke covers it; login endpoint is rate-limited across instances.

### 0.2 Kill the committed secret and validate every env var at boot
- [ ] **Remove the `AUTH_SECRET` fallback** in `docker-compose.yml:47` (`local-dev-secret-change-me-...` — known, commit-visible JWT signing key). Generate a new secret; plan rotation for any environment that ever used the fallback (invalidate all sessions).
- [ ] **Create `lib/env.ts`** — a zod-validated env module with fail-fast `serverEnv` / `clientEnv`, including minimum entropy checks on `AUTH_SECRET`, `CRON_SECRET`, webhook secrets. Import it from `lib/db.ts`, `lib/payments/*`, auth, email, search.
- [ ] **Fix `.env.example` drift** — add missing keys: `NEXT_PUBLIC_SENTRY_DSN` (code reads this; example only has `SENTRY_DSN`), `CRON_SECRET`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SANITY_API_TOKEN` (code) vs `SANITY_API_READ_TOKEN` (example), `MEILI_API_KEY` (code) vs `MEILI_MASTER_KEY`/`MEILI_SEARCH_KEY` (example), `R2_PUBLIC_BASE_URL`/`NEXT_PUBLIC_R2_BASE_URL` (code) vs `R2_PUBLIC_URL` (example). Delete or wire the 9 dead keys (`STRIPE_TAX_ENABLED`, `COINBASE_COMMERCE_API_KEY`, `SENDCLOUD_WEBHOOK_SECRET`, `SANITY_STUDIO_REWRITE`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `VERCEL_ENV`, `VIES_ENABLED`, `BANNED_COUNTRIES`, …).
- **Acceptance:** `pnpm build` with a deliberately broken env fails with a readable error naming the missing key; `.env.example` exactly matches the env module.

### 0.3 Patch the known-vulnerable dependencies
- [ ] `next@15.1.4` → latest 15.5.x (critical flight-protocol RCE GHSA-9qr9-h5gf-34mp, critical middleware auth bypass CVE-2025-29927, unauthenticated RCE/DoS chain through 15.5.x).
- [ ] `next-auth@5.0.0-beta.25` → ≥ beta.32 (`@auth/core` ≥ 0.41.3): critical fail-open auth-check and email homoglyph advisories.
- [ ] `drizzle-orm@0.38.3` → ≥ 0.45.2 (SQL-injection advisory; app uses `db.execute(sql``)`).
- [ ] `sharp` → ≥ 0.35.4, `postcss`, `uuid`, transitive `axios`/`glob`/`adm-zip` via Sanity toolchain. Run `pnpm audit --prod` before/after.
- [ ] Re-run lint/typecheck/tests/build after the bump; Next 15.1→15.5 touches middleware and image optimizer behavior — smoke-test image routes and middleware locale redirects.
- **Acceptance:** `pnpm audit --prod` reports 0 critical / 0 high; full build + smoke suite green on the upgraded stack.

### 0.4 Fix cron auth and the open email relay
- [ ] `app/api/cart-recovery/route.ts:6` and `app/api/review-request/route.ts:11` compare against `` `Bearer ${process.env.CRON_SECRET}` `` — with `CRON_SECRET` unset this accepts `Bearer undefined`. Fail closed when the secret is missing, use `crypto.timingSafeEqual`, and enforce a minimum length via `lib/env.ts`.
- [ ] Add zod validation to `cart-recovery` (it currently emails to an attacker-supplied address with attacker-controlled item names/prices → open relay + HTML injection). Escape user data in `lib/email/index.ts` templates.
- **Acceptance:** both endpoints return 401 without a correct secret in every environment; no route can be invoked with `Bearer undefined`.

### 0.5 Fix GDPR delete (it currently does nothing) and sanitize export
- [ ] `app/[locale]/account/delete/confirm/[token]/page.tsx:65-71` records a *second pending request* instead of deleting. Wire it to `confirmDeleteRequest` + `softDeleteUser` (`lib/gdpr/service.ts:80-121`, currently called from nowhere), token/expiry validation, and the promised confirmation email (`app/api/account/gdpr/route.ts:52-55` never sends it).
- [ ] `lib/gdpr/service.ts:29-46` exports the full `users` row **including `passwordHash`** (`db/schema/index.ts:22`). Select explicit columns; add `accounts`, `sessions`, `passkeys`, `notifications`, `notification_preferences`, `activity_events`, AI conversations/messages/memories, and support tickets to the export.
- [ ] Remove the duplicate pending-row insert in `app/api/account/gdpr/route.ts:44-55`.
- **Acceptance:** delete flow anonymizes PII in a staging DB (verify orders anonymized first — `orders.user_id` is `NO ACTION`), export JSON contains no secrets, both have integration tests.

### 0.6 Remove fabricated social proof (EU legal blocker)
- [ ] Delete or replace `components/product/ProductReviews.tsx` (invented named "verified" reviews with 2026 dates) and `components/home/Testimonials.tsx` + `components/home/TrustpilotWidget.tsx` (invented quotes, "2,400+ verified labs", unverified Trustpilot claim).
- [ ] Replace with an honest empty state until a real, purchase-verified review system ships (post-launch, Phase 5+).
- **Acceptance:** no fabricated reviewer names, badges, counts, or third-party rating claims exist in the rendered site or content.

### 0.7 Stop the forms that lie
- [ ] `/api/newsletter` (`app/api/newsletter/route.ts:14-18`) and `/api/contact` (`app/api/contact/route.ts:16-19`) `console.log` PII and return `{ok:true}`. Either wire them (Resend + `newsletter_subscribers` with double opt-in; support ticket row + staff notification) or hide the forms until wired. The modal currently promises "Check your inbox for confirmation" (`components/home/NewsletterModal.tsx:78`) and the contact form promises a 24 h reply.
- [ ] Remove `console.log` PII from both routes regardless.
- **Acceptance:** submitting either form either creates a real, verifiable record/email or the form is not rendered.

---

## 3. Phase 1 — Money path integrity (P0/P1, 4–6 days)

> **Status (2026-09-14): executed and verified.** Shipping addresses (incl. guest, nullable `user_id`) and logged-in `user_id` are persisted; shipping price + FI 25.5% VAT are computed server-side from `lib/pricing.ts` (`lib/shipping` rates re-resolved server-side); `createOrder` reserves stock and inserts order+items in one transaction with collision-retrying order numbers; Stripe + Coinbase webhooks are idempotent (new `webhook_events` ledger), verify amounts/status transitions, and release stock on final failure; Coinbase checkout creates real charges and persists charge id + tx hash; the Stripe `return_url` now includes the order id and the confirmation page enforces ownership. Verified on a fresh migrated DB: correct VAT math, oversell blocked, two concurrent orders for the last unit → exactly one winner. Decision D5 = FI 25.5% (OSS deferred); D3 = crypto fixed end-to-end.

The checkout/order pipeline must be transactional, server-authoritative, and idempotent before anyone pays real money.

### 1.1 Persist what the customer entered
- [ ] `app/api/checkout/route.ts:25-31` never passes `userId` or address IDs; `components/checkout/CheckoutForm.tsx:68-73` sends only email/items/shipping/paymentMethod. Name/street/postal/city/country/VAT live only in client storage (`lib/checkout/store.ts:6-16`) and are discarded.
- [ ] Accept a zod-validated `shippingAddress` (+ optional `billingAddress`, `vatId`), insert `addresses` rows, pass IDs + `userId` (from `auth()`) into `createOrder`.
- [ ] Link logged-in orders to the user so `/account/orders` actually shows them (`app/[locale]/account/orders/page.tsx:24`).
- **Acceptance:** placed order row has non-null `user_id` and address FKs; order detail page renders the delivery address.

### 1.2 Make pricing server-authoritative
- [ ] `shippingCents` is client-supplied (`app/api/checkout/route.ts:11-18,28`; `lib/orders/service.ts:57,68`) — compute shipping server-side from `lib/shipping` or a fixed table derived from cart weight/country. Never trust the browser.
- [ ] VAT: implement D5. If Stripe Tax: enable automatic tax on the PaymentIntent/Session and stop hardcoding 24% (`lib/orders/service.ts:56`, `components/checkout/CheckoutForm.tsx:43`, `CheckoutSummary.tsx:28`). If in-house: 25.5% FI + OSS country rates via `lib/vat` and zero-rate on validated B2B VAT IDs (VIES is implemented at `lib/vat/index.ts` but never called from checkout).
- [ ] Update the legal terms copy if behavior cannot match it (`app/[locale]/legal/terms/page.tsx:30-34` promises inclusive OSS VAT and B2B reverse-charge).
- **Acceptance:** tampering with `shippingCents`/VAT in the request changes nothing; a €100 cart ships for the server-computed rate; a valid FI VAT ID zero-rates on a B2B invoice.

### 1.3 Transactions, stock, and order numbers
- [ ] Wrap `createOrder` (`lib/orders/service.ts:34-100`) in a `db.transaction` (order + items atomic); currently a failure between inserts leaves an orphan order.
- [ ] Reserve/validate stock atomically at order creation (`SELECT … FOR UPDATE` or conditional `UPDATE … WHERE stock >= qty` returning row count) instead of read-then-check (`lib/orders/service.ts:36-46`) with decrement deferred to the webhook. `GREATEST(0, stock - qty)` (`:165-172`) silently clamps oversells — make it fail loudly.
- [ ] Replace `Math.random()` order numbers (`lib/orders/service.ts:27-32`) with a DB sequence or collision-retry loop; the current space is brute-forceable and is the only secret protecting the anonymous AI order-status tool (`lib/ai/tools/order-status.ts:47-59`).
- [ ] Batch `decrementStock` into one `UPDATE … FROM (VALUES …)` and dedupe `markNotificationsRead` (`lib/notifications/service.ts:94-99`) with `inArray`.
- **Acceptance:** concurrent checkout of the last unit yields exactly one order; killing the process mid-create leaves no orphan rows; duplicate order numbers impossible.

### 1.4 Webhook idempotency + amount verification
- [ ] `app/api/webhooks/stripe/route.ts:28-107` re-runs stock decrement + confirmation email on every delivery. Add a `processed_webhook_events` table (or unique `stripe_event_id` on orders) checked in a transaction; skip already-processed event IDs.
- [ ] Verify `pi.amount`/`currency` against `order.totalCents` before `markOrderPaid`; guard status transitions (`markOrderFailed` currently can clobber a paid order — `lib/orders/service.ts:151-156`).
- [ ] Stop leaking `err.message` from signature failures (`:25`); log details server-side.
- [ ] Coinbase webhook (`app/api/webhooks/coinbase/route.ts:15,17`): use `crypto.timingSafeEqual`, wrap `JSON.parse` in try/catch + schema, fail closed when secret missing, and decide D3 (fix stock handling or remove the payment option).
- [ ] Add idempotency key on `stripe.paymentIntents.create` (`app/api/checkout/route.ts:34-43`) to stop double-submit duplicate orders.
- **Acceptance:** replaying the same Stripe event ID N times produces one stock decrement and one email; amount mismatch rejects and alerts.

### 1.5 Confirmation page: fix the 404 and the IDOR
- [ ] `components/checkout/PaymentStep.tsx:33` returns users to `/{locale}/checkout/confirm` (no `[orderId]`) — every 3DS/SEPA/wallet redirect lands on a 404 after payment. Point at `/{locale}/checkout/confirm/{orderId}` (or a session-based lookup).
- [ ] `app/[locale]/checkout/confirm/[orderId]/page.tsx:20-21` renders `order.email`/totals to anyone with the UUID, and the UUID leaks via Referer/history. Require session ownership **or** a signed one-time token, or render only a generic success message for anonymous visitors.
- **Acceptance:** `curl` of a confirmation URL without the owning session or token leaks no order data; full Stripe test-mode redirect flow reaches a rendered confirmation.

---

## 4. Phase 2 — Security hardening (P0/P1, 4–6 days)

> **Status (2026-09-14): executed and verified.** Referral endpoints require a session and rate limits (401 without auth); admin AI routes use the DB-backed `getAdminOrNull()` guard (403 without auth, stale JWT roles no longer grant access); shared `lib/security/rate-limit.ts` now covers checkout, contact, newsletter, partner, referral, search, VAT, shipping, forum write routes, account export/delete, AI feedback/memory/consent/conversations/identity and admin draft-reply (LLM spend, fail-closed). AI chat accepts only `user|assistant` turns, scans replayed history for injection, derives IP via trusted headers and no longer streams provider errors. Anonymous identity cookies are HMAC-signed (`lib/ai/memory/anon.ts`) and memory writes are capped (2 KB value / 50 rows) — verified end-to-end. Meilisearch filters/sorts are allowlisted (plus the `MEILI_API_KEY` alias fix), JSON-LD escapes `<`, numeric pagination is clamped, Sanity Vision is dev-only, and Stripe env access is validated. Headers now include COOP/CORP and a tightened CSP (`img-src` host list, PostHog asset hosts, no `postgraphile`), Permissions-Policy microphone disabled. **CSP nonce decision:** a per-request nonce was implemented and tested, but Next.js only stamps nonces onto inline scripts for dynamically rendered pages — static/ISR pages (the storefront default) would break. Nonce-based CSP is therefore deferred until/unless dynamic rendering is acceptable; the static CSP keeps `script-src 'unsafe-inline'` as a documented launch trade-off.

### 2.1 Authorization gaps
- [ ] **Referral endpoints are fully unauthenticated**: `app/api/referral/generate/route.ts:11-16` accepts any `userId`; `app/api/referral/redeem/route.ts:6-14` lets anyone bind a referral to any user. Require session, derive `userId` from it, zod-validate, rate-limit, and stop confirming code existence on redeem (`:24`).
- [ ] **Admin AI routes trust the JWT role** (`app/api/admin/ai/conversations/route.ts:18-22`, `[id]/route.ts:22-26`, `draft-reply/route.ts:36-44`, `app/api/ai/chat/route.ts:128-131`), which is hydrated once and stale for up to 30 days (`lib/auth/index.ts:64-76`). Use the DB-backed `requireAdmin` (`lib/admin/guard.ts`) everywhere; also align the `moderator` role handling.
- [ ] **Order status tool** (`lib/ai/tools/order-status.ts:47-79`): rate-limit per email/IP and consider requiring auth for repeat queries.
- [ ] Review `lib/admin/guard.ts` and `lib/admin/runtime.ts` as the single source of truth; add a test that every `app/api/admin/**/route.ts` imports a guard.
- **Acceptance:** a demoted admin loses access on the next request (test); unauthenticated referral calls are 401; both flows have rate limits.

### 2.2 Rate limiting coverage (currently only `/api/ai/chat` has any)
- [ ] Add a shared `lib/rate-limit.ts` (Upstash sliding window, in-memory dev fallback) and apply to: `/api/checkout`, `/api/contact`, `/api/newsletter`, `/api/partner`, `/api/referral/*`, `/api/search`, `/api/vat`, `/api/shipping`, `/api/forum/*` (post/report flooding), `/api/admin/ai/draft-reply` (LLM spend), `/api/ai/feedback|memory|conversations|consent`, `/api/account/export|delete`, `/api/sentry-tunnel`.
- [ ] Make the limiter **fail closed** for expensive endpoints and **fail open with alerting** for cheap ones when Redis is down — today a Redis outage 500s `/api/ai/chat` (`lib/ai/rate-limit.ts:105` is unguarded) while an unconfigured limiter silently returns per-instance limits.
- [ ] Harden AI chat IP derivation (`app/api/ai/chat/route.ts:87-93`): `x-forwarded-for` is spoofable on non-proxied deploys; use the platform's trusted header (`x-vercel-forwarded-for`/`cf-connecting-ip`) or session key.
- **Acceptance:** each listed endpoint returns 429 under burst; hammering with rotated `x-forwarded-for` does not bypass `/api/ai/chat`.

### 2.3 AI subsystem
- [ ] `bodySchema` accepts client `role: "system" | "tool"` (`app/api/ai/chat/route.ts:47-51`) and non-consenting sessions replay full client history (`:213-222`) past the single-message guardrail check. Restrict roles to `user|assistant`, run `preflightInput` across the replayed turns, and never stream raw model/provider error text (`:327`).
- [ ] `/api/ai/memory` stores `z.unknown()` values under a client-controlled unsigned cookie (`app/api/ai/memory/route.ts:17-21,49-65`) and injects them into the system prompt (`lib/ai/prompts/system.ts:173-178`) — cap size/serialized length, cap rows per identity, sign the anon cookie, and treat stored memory as untrusted data in the prompt.
- **Acceptance:** crafted history cannot inject a system turn; memory writes are size-bounded; a red-team prompt via memory cannot alter agent policy.

### 2.4 Web/CSP/headers
- [ ] Replace `'unsafe-inline'` in `script-src` with per-request nonces + `strict-dynamic` (`next.config.ts:10-16,57`). Add `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`; tighten `img-src https:`; fix `Permissions-Policy` microphone allowance (`:23`); remove unused `https://*.postgraphile.com` from `connect-src` (`:61`).
- [ ] The CSP currently blocks PostHog's asset host (`eu-assets.i.posthog.com`) while the cookie policy claims analytics works — fix `script-src`/`connect-src` so consented PostHog actually loads, or remove the claim (`app/[locale]/legal/cookies/page.tsx:32-36`).
- [ ] JSON-LD hardening: escape `<` in `components/seo/JsonLd.tsx:14`.
- [ ] Meilisearch filter injection: `lib/search/meilisearch.ts:109-120` interpolates `locale`/`category`/`sort` into filter strings; validate against an allowlist. Fix the `MEILI_API_KEY` vs `MEILI_MASTER_KEY` env mismatch or search will silently run in-memory in production.
- [ ] GDPR export endpoint + admin pagination: validate/clamp numeric params (`app/api/search/route.ts:10-14`, `app/api/admin/audit/route.ts:14-19`, `app/api/admin/ai/conversations/route.ts:26`) to prevent NaN 500s and unbounded limits.
- [ ] Sanity Studio: gate `visionTool()` to development (`sanity/sanity.config.ts:11`) or protect `/studio`.
- [ ] Sentry tunnel `/api/sentry-tunnel`: rate-limit and restrict payload size.
- **Acceptance:** CSP report-only run shows zero needed `unsafe-inline`; Meili rejects injection attempts; consenting browser sends PostHog events (verified in network tab).

### 2.5 Payment/search correctness that doubles as security
- [ ] `lib/payments/stripe.ts:7` and the Coinbase webhook use non-null assertions on env vars — replace with `lib/env.ts` accessors.
- [ ] `app/api/checkout/route.ts:56-59` (and `vat`, `shipping`, `newsletter`, `contact`, `partner` routes) return raw `err.message` — return generic messages, log details.

---

## 5. Phase 3 — Performance & speed (P1, 5–7 days)

> **Status (2026-09-14): complete.** **3.1** PDP restored to SSG/ISR by moving member-aware UI (session + saved plans) into the client-side `ProductDetailActions` island — the page no longer calls `auth()`; `/shop` is now SSG per locale with a client catalog island (URL-driven filters/sorting, no `searchParams` in the page); `documents/[id]` and `plans/[slug]` use ISR. **3.2** product gallery defaults to a static tile so three.js + the 1.6 MB HDRI only load on explicit 3D selection; the canvas pauses off-screen and honors `prefers-reduced-motion`; `/shop`'s 3D carousel is dynamically imported only for the 3D view. **3.3** the full catalog is no longer serialized into every RSC payload (Header/ChromeIslands import it directly) and `NextIntlClientProvider` receives only the 19 namespaces client components actually use. **3.4** Stripe.js loads only on the payment step, chat bundle defers to browser idle, OG images cached (`s-maxage=86400`). **3.5** query/caching work from the partial pass retained (batched plan items, memoized category seeding/auth/thread reads, transactions, atomic reputation, Sanity/VIES/shipping caches, RAG BM25 + embedding run concurrently). **3.6** index set + regenerated baseline migration. **3.7** removed unused `@tanstack/react-query`, `nuqs`, `bcryptjs`; replaced the year-long `/_next/image` immutable override with `minimumCacheTTL: 604800`. Also removed invalid `contentType` route exports, disabled `typedRoutes` (was blocking builds), added `NEXT_DIST_DIR` for isolated verification builds, and added English `auth`/`newsletter` keys to de/sv/nl. Verified: `/[locale]/shop` and `/[locale]/shop/[slug]` now prerender as SSG/ISR, zero missing-message errors, typecheck + 139 tests + production build green.


Targets: **LCP < 2.5 s mobile / < 1.5 s desktop on PDP and `/shop`; INP < 200 ms; CLS < 0.1; initial JS < 250 KB gzip on catalog routes; TTFB < 200 ms cached.**

### 3.1 Restore static rendering where it was silently lost
- [ ] **PDP ISR is dead**: `app/[locale]/shop/[slug]/page.tsx:4,34-38` declare `revalidate = 600` + `generateStaticParams`, but `:62` calls `getCurrentMember()` → `auth()` (`lib/community/auth.ts:19`), which reads cookies and forces dynamic rendering. Every product view is a per-request SSR + multiple DB hits. Split member-aware UI into a small dynamic island (nested Suspense + client fetch), keep the product shell static/ISR. Also `dynamic` the product 3D scene only on interaction (3.2).
- [ ] `app/[locale]/shop/page.tsx:19-22` awaits `searchParams`, forcing dynamic rendering on a fully static catalog. Move filter/sort state to a client island (or `nuqs`) so the route can be ISR.
- [ ] Remove `force-dynamic` from near-static routes: `app/[locale]/documents/page.tsx:7`, `documents/[id]/page.tsx:40`, `plans/[slug]/page.tsx:1`, and replace with `revalidate` (community hub gets 30–60 s).
- [ ] Add `export const revalidate = 60` to the home page (activity feed at `:307` is frozen until deploy) and/or Suspense-stream the feed.
- [ ] **Acceptance:** `next build` output marks PDP/`/shop`/documents/plans as SSG/ISR; anonymous HTML arrives from cache; `x-vercel-cache` HIT on repeat.

### 3.2 3D and media weight
- [ ] **PDP defaults to the 3D tile**: `components/product/ProductGallery.tsx:35-43,134` selects the three.js viewer (`:147-149`) on load; every visitor downloads three + drei + postprocessing. Default to the static SVG tile (`GalleryStaticTile` already exists); mount 3D only on explicit click.
- [ ] **1.6 MB uncompressed HDR** `/public/hdr/studio_small_03_1k.hdr` loads for both the product scene (`components/three/ProductVialScene.tsx:56`) and home hero (`components/three/Lighting.tsx:13`). Compress to 256/512 & use `.exr`, or replace with `@react-three/drei` `Environment preset`/`Lightformer`. Load only when a scene mounts.
- [ ] Pause off-screen canvases: `frameloop="demand"`, IntersectionObserver pause when scrolled out. Honor `prefers-reduced-motion` in both scenes (`use-reduced-motion` hook exists but isn't passed in).
- [ ] **`/shop` ships the 3D carousel in grid view**: `app/[locale]/shop/page.tsx:6` statically imports `Shop3DCarousel` (which pulls three/drei/postprocessing at `components/three/Shop3DCarousel.tsx:7-8,22-24`) though the default view is grid (`:66`). `dynamic(() => import(...), { ssr: false })` only when `view === "3d"`.
- [ ] Add `optimizePackageImports: ["@react-three/drei", "postprocessing", "motion"]` to `next.config.ts:32-38`; verify `MotionProvider` (`components/layout/MotionProvider.tsx:3`) isn't pulling all of `motion/react` into the shared layout chunk.
- **Acceptance:** PDP initial JS (mobile, gzip) drops by > 60%; no HDR/three request until user opens the 3D view (verify in network tab).

### 3.3 Trim the RSC payload (every page pays for this)
- [ ] `app/[locale]/layout.tsx:9,103` serializes the entire 15-product/5-locale catalog (~23.7 KB raw) into every response for `Header`/`ChromeIslands`. Send a slim menu shape (`slug`, localized `name`, `category`, `hue`, `minPrice`) or fetch client-side.
- [ ] `app/[locale]/layout.tsx:102` `<NextIntlClientProvider>` has no `messages` prop → the whole locale JSON (~21–23 KB) is serialized on every response. Pass only the namespaces client components use.
- [ ] Stop client components importing the full data file when a slim prop suffices (`components/cart/CartView.tsx:9`, `components/product/WishlistView.tsx:7`, `components/product/FrequentlyBought.tsx:173`).
- **Acceptance:** RSC payload for `/en` reduced by > 50% (measure `self.__next_f` size before/after).

### 3.4 Lazy-load the expensive interactive surfaces
- [ ] Stripe loads on all checkout steps: `components/checkout/CheckoutForm.tsx:13-14` statically imports `PaymentStep`/`StripeProvider`; every step page renders `CheckoutForm`. `dynamic()` both, mount only for the payment step.
- [ ] Chat widget downloads on every page after hydration: `components/ai/chat/lazy-chat-widget.tsx:5-8` imports on render. Render the dynamic bundle only after first intent (bubble click or `requestIdleCallback`), keep `react-markdown`/`remark-gfm` out of the initial chat chunk (`components/ai/MessageList.tsx:30-31`).
- [ ] Add `Cache-Control: public, s-maxage=86400, stale-while-revalidate` to OG image routes (e.g. `app/api/og/default/route.tsx:5-12`) — `lib/og/render.tsx` re-renders satori/resvg every hit.
- **Acceptance:** checkout email/address steps load no stripe.js; no chat chunk in initial network waterfall until interaction.

### 3.5 Query & caching efficiency
- [ ] **`ensureCategories()` writes on read** and runs twice on some routes (`lib/community/service.ts:27-42,44-56`, called from `app/[locale]/community/new/page.tsx:30-31` and `listThreads` callers). Move seeding to migration/seed; make `listCategories` a plain select; pass `categoryId` into `listThreads` instead of re-looking-up the slug.
- [ ] **N+1 in `listPlansForOwner`** (`lib/research-plans/service.ts:40-81`, query per plan) — batch with `inArray(researchPlanItems.planId, planIds)` (pattern exists in `lib/gdpr/service.ts:49-53`). Also `getPlanByShareSlug` selects the same plan/items 3× and is called twice per page (metadata + body).
- [ ] **Thread page does ~7 queries + 2 auth resolutions**: `app/[locale]/community/thread/[slug]/page.tsx:28,46,50` plus `listPostsForThread` re-fetching the thread (`lib/community/service.ts:303-305`) and `getReactionsForPosts` re-resolving the member (`:418`). Memoize `getCurrentMember` with React `cache()` and pass fetched rows down.
- [ ] **Glossary fetches the full term list twice per render**: `app/[locale]/glossary/page.tsx:38` runs `getGlossaryTermsByCategory()` which internally calls `listGlossaryTerms()` (`lib/glossary/sanity.ts:70-86`) in parallel with a direct call. Derive grouping from one fetch.
- [ ] Add `cache()` to metadata/body duplicates: `getPostBySlug`, `getDocumentById`, `getPlanByShareSlug`, `app/[locale]/account/page.tsx:20-21` (`Promise.all` there too; remove unused `listDocumentsForProduct` import at `:8`).
- [ ] Cache Sanity reads (`unstable_cache` + tags or `revalidate` on blog/glossary routes) — every request hits Sanity today (`lib/blog/posts.ts:67-84`, `lib/glossary/sanity.ts:46-68`). Blog `[slug]` also fetches all glossary terms just for inline links (`app/[locale]/blog/[slug]/page.tsx:154`).
- [ ] Cache VIES VAT lookups (`lib/vat/index.ts:23`) and short-cache shipping quotes (`lib/shipping/index.ts:31`); run RAG BM25 + embedding concurrently (`lib/ai/rag/retrieval.ts:66-82`).
- [ ] Wrap multi-write community flows in transactions (`lib/community/service.ts:103-121,249-260,357-403`) and replace `adjustReputation`'s read-modify-write (`:461-474`).
- **Acceptance:** query counts per page drop (log via Drizzle instrumentation), no write queries on GET requests, glossary/thread pages ≤ 3 queries.

### 3.6 Database indexes (add in one migration)
- [ ] Missing indexes on hot paths: `shipments.orderId`, `shipments.deliveredAt`, `vials.productId`, `addresses.userId`, `accounts.userId`, `sessions.userId`, `passkeys.userId`, `batches.vialId`, `coaTests.batchId`, `orderItems.vialId`.
- [ ] Composite/ordering: `orders(user_id, placed_at desc)`, `forum_threads(status, last_activity_at desc)`, `forum_reports(status, created_at desc)`, `forum_moderation_events(verdict, created_at)`, `audit_log(created_at)`, `users(created_at)`, `research_plans(created_at)`, `ai_conversations(last_message_at)`.
- [ ] Drop redundant indexes (unique constraint already indexes): `products_slug_idx` (`db/schema/index.ts:126`), `research_plans_share_idx` (`:425`), `forum_categories_slug_idx` (`:298`).
- [ ] Add `unique(plan_id, product_id)` on `research_plan_items` and FKs on AI tables (`db/schema/ai.ts:109,161,187` are missing FKs).
- **Acceptance:** `EXPLAIN ANALYZE` on the 5 hottest queries uses index scans; `drizzle-kit generate` produces exactly this migration.

### 3.7 Cleanup
- [ ] Remove unused deps `@tanstack/react-query`, `nuqs`, `bcryptjs` (zero imports) and dead `_next/image` year-long immutable override risk (`next.config.ts:78-83` — scope it or use `minimumCacheTTL`).
- [ ] Scope `.next/static` caching stays as is; verify `/_next/image` header only applies to content-hashed sources.

---

## 6. Phase 4 — Stability & observability (P0/P1, 3–4 days)

> **Status (2026-09-14): complete (deploy pipeline deferred to Phase 5).** **4.1** done — single verified baseline migration + `pnpm db:migrate`, deploy script off `push --force`. **4.2** Sentry DSN env mismatch fixed (server falls back to `SENTRY_DSN`), `app/[locale]/error.tsx` now reports to Sentry, and hidden source-map upload is enabled automatically when `SENTRY_AUTH_TOKEN` is present (skipped otherwise so token-less builds don't fail). **4.3** added `/api/health` (env + DB probe, 503 when degraded, no-store) and verified `{"status":"ok","checks":{"env":true,"db":true}}`; Dockerfile now has a `HEALTHCHECK` and its build args were corrected to `NEXT_PUBLIC_SANITY_*`/`NEXT_PUBLIC_POSTHOG_KEY`; Sendcloud and Meilisearch calls now have hard timeouts; `lib/logger.ts` emits structured JSON logs and the money paths (Stripe/Coinbase webhooks, checkout, email) use it instead of `console.*`; `scripts/backup-db.sh` added for scheduled `pg_dump` backups (Neon PITR is the primary on Vercel). **4.4** left for Phase 5: git init/CI green, migration-on-deploy step in the release workflow.

### 4.1 Make the database reproducible (biggest operational blocker)

> **Status (2026-09-14): executed.** Old hand-written migrations preserved in `db/migrations-legacy/`; a single generated baseline (`db/migrations/0000_*.sql`) now covers all 41 tables including AI + newsletter + webhook ledger, with `CREATE EXTENSION vector` and the raw GIN/HNSW indexes merged in. `pnpm db:migrate` added and verified on an empty database (41 tables, vector extension, custom indexes). `scripts/deploy-local.sh` now runs migrations instead of `push --force` (push-created dev DBs need a one-time `--reset-db`).
- [ ] **Schema/migration drift**: `db/schema/index.ts` defines `referral_redemptions`, `research_plans`, `research_plan_items`, `activity_events`, `notifications`, `notification_preferences`, `documents`, `gdpr_requests` with **no migration**; `audit_log`, `rewards_accounts`, `orders` have drifted columns; `forum_reports.reporter_id` is nullable in schema (`:370`) but `NOT NULL` in `0000` SQL with `ON DELETE set null`. `db/migrations/meta/` has only the `0000` snapshot, so `drizzle-kit generate` currently diffs against stale state and would produce garbage.
- [ ] Re-baseline: snapshot the current schema, generate one clean `0004` (or fresh baseline) migration covering all drift + Phase 3 indexes, verify `drizzle-kit migrate` on an empty Postgres produces a DB the app runs against, and add `db:migrate` to package.json + deploy pipeline (no more `drizzle-kit push --force` in `scripts/deploy-local.sh:114`).
- [ ] Copy `db/` into the Docker runtime image (`Dockerfile:72-76` currently omits it) or run migrations as a release step.
- [ ] Migrations before app start in every environment; fail deploy if migration fails.
- **Acceptance:** `createdb` + `pnpm db:migrate` + `pnpm start` → all routes work; CI runs migrate against an ephemeral Postgres.

### 4.2 Sentry actually works
- [ ] `instrumentation.ts:5` and `instrumentation-client.ts:4` read `NEXT_PUBLIC_SENTRY_DSN`, but `.env.example:55`/`docker-compose.yml:56` define `SENTRY_DSN` → observability is off in every real environment. Align names via `lib/env.ts`.
- [ ] Add `Sentry.captureException` to `app/[locale]/error.tsx` (only `global-error.tsx:12` reports today). Add `NEXT_RUNTIME` guard in `instrumentation.ts`.
- [ ] Enable source maps for production (currently `sourcemaps: { disable: true }`, `next.config.ts:99`) with hidden-sourcemap upload; verify readable stacks in Sentry.
- **Acceptance:** a thrown error in staging appears in Sentry with a readable stack; global + route error boundaries both report.

### 4.3 Health, resilience, and timeouts
- [ ] Add `/api/health` (DB ping + env presence + version) and wire Docker/compose healthcheck; `docker-compose.yml:66` uses `wget`, absent from `node:22-bookworm-slim`, so the container is permanently unhealthy. Fix Docker build args (`SANITY_PROJECT_ID` vs `NEXT_PUBLIC_SANITY_PROJECT_ID`, missing PostHog arg).
- [ ] Wrap external calls with timeouts + retries/fallbacks: Sendcloud (`lib/shipping/index.ts:31`), Meilisearch (`lib/search/meilisearch.ts:115`), MiniMax, Resend. Define behavior per dependency outage (quote fallback already exists for shipping; replicate for search/email).
- [ ] DB pooling: `lib/db.ts:19` uses `max: 10` with a singleton only in non-production — add `connect_timeout`/`max_lifetime`, and size for the host (serverless: 1–3 + pooler; VPS: keep 10).
- [ ] Structured logging (pino) with request IDs; remove all PII `console.log`s (newsletter/contact); audit `lib/audit/log.ts` remains the source for admin actions.
- [ ] Backups: automated Postgres backups (Neon PITR or `pg_dump` cron) + a documented restore drill before launch.
- **Acceptance:** health endpoint green in compose; killing Redis/external APIs degrades gracefully (no 500 sprays); restore drill recreates staging from backup.

### 4.4 Deployment
- [ ] `git init` and commit the repo (currently **not** a git repository — CI can never run, see Phase 5).
- [ ] CI build job fails by design: `pnpm build` runs without `DATABASE_URL` (`lib/db.ts:12-14` throws in production), and `app/[locale]/shop/[slug]/page.tsx` imports DB modules at module scope. Provide a CI Postgres service or make DB imports lazy/optional at build time.
- [ ] CI Lighthouse job is broken (no install/build/`startServerCommand`, `.lighthouserc.json` audited `localhost:3000`). Fix or delete until Phase 5.
- [ ] Remove throwaway scripts from the repo (`scripts/*-tmp.mjs` — they hardcode a macOS Playwright path) or move to a gitignored `scripts/tmp/`.
- **Acceptance:** CI green on the default branch: typecheck → lint → test → migrate → build → smoke; no temp scripts in the tree.

---

## 7. Phase 5 — Launch readiness & QA (P0/P1, 3–5 days)

> **Status (2026-09-14): largely complete (load test + go/no-go sign-off remain as operational tasks).** **5.1** Playwright config added; 12 e2e specs already in place (auth, checkout, cart, shop, forum, chat, i18n, a11y, 3D render, route smoke, homepage, instanced vial); Vitest include extended to `tests/unit/**`; unit tests added for `lib/legal`; coverage thresholds set on `lib/orders/service.ts` and `lib/gdpr/service.ts` (50%). **5.2** CI workflow rewritten: `quality` job runs against a service Postgres (migrate first), includes `pnpm audit --prod --audit-level=high` as a gate; new `bundle-size` job caps the shared chunk payload at ~300 KB gzipped; `e2e` and `a11y` jobs use a real DB and run migrations; Lighthouse now boots its own server via `.lighthouserc.json` (with per-category budgets) instead of failing against a missing host. Lefthook config added (pre-commit biome + typecheck). **5.3** footer legal identity is now env-driven (`NEXT_PUBLIC_LEGAL_*`); obvious `FI-PENDING` placeholders remain until the real Y-tunnus and VAT ID are issued (documented in `.env.example` and RUNBOOK). Icons: only `favicon.svg` + `/api/og/default` are referenced (the broken `/og/default.png` and `/apple-touch-icon.png` references are gone). **5.4** `RUNBOOK.md` covers deploy, health checks, common incidents, secret rotation, DB restore (Neon PITR + `pg_dump` script), webhook replay, AI eval, and monitoring thresholds. Outstanding operational items (not code): run the staging load test, sign the §9 go/no-go checklist, hand the runbook to the on-call rotation.

### 5.1 Tests that protect the money path
- [ ] E2E (Playwright) — create `playwright.config.ts` (none exists) and specs: register/login, add-to-cart → checkout (Stripe test mode) → confirmation; forum thread → reply → react → report; account → order history → GDPR export.
- [ ] Integration tests (Vitest, real Postgres via testcontainers or a CI service): `lib/orders/service.ts` (transactionality, stock race, order number collisions), webhook handlers (idempotency, amount mismatch, bad signature), VAT/shipping price computation, auth rate limiting.
- [ ] Extend `vitest.config.ts:7` include beyond `lib/**`/`scripts/**`; add coverage thresholds on `lib/orders`, `lib/payments`, `lib/gdpr`.
- **Acceptance:** `pnpm test` + `pnpm test:e2e` green in CI; a regression in checkout pricing or webhook idempotency fails CI.

### 5.2 CI/CD pipeline
- [ ] GitHub Actions: quality (biome + tsc), test (vitest + migrate against service Postgres), build (with env), e2e smoke, `pnpm audit --prod` gate, Lighthouse CI with `startServerCommand` and per-route budgets (LCP/INP/CLS/JS), bundle-size budget check.
- [ ] Gate merges on all checks; require review. Add secret scanning (gitleaks) — the committed `AUTH_SECRET` fallback shows it's needed.
- [ ] `postinstall: lefthook install` (`package.json:26`) references a missing `lefthook.yml` — add pre-commit lint/typecheck or remove.
- **Acceptance:** a PR with a deliberate type error, failing test, and bundle regression is blocked automatically.

### 5.3 Content, legal, analytics
- [ ] Legal identity: footer shows `VAT: FI-pending` and no business ID/registered address (`components/layout/Footer.tsx:151-153`); replace with real `Y-tunnus`, VAT ID, address; fix or remove `href="#"` social links (`:78-98`).
- [ ] Analytics consent must match claims and code: Vercel `Analytics`/`SpeedInsights` load unconditionally (`app/layout.tsx:1-2,16-17`) while privacy policy promises consent-gated analytics; Plausible is claimed but not implemented; add the footer "Cookies" consent-reset control the cookie policy promises.
- [ ] i18n: either complete DE/NL/SV or hide them (D6); stop hardcoded English in checkout (`components/checkout/CheckoutForm.tsx:271-287`).
- [ ] SEO: fix `robots.ts:9` admin path (`/admin/` vs `/[locale]/admin`); add products + legal pages to `app/sitemap.ts:26-40`; verify OG icons exist (`/og/default.png`, `/apple-touch-icon.png` are 404s — `app/[locale]/layout.tsx:44,50,55`).
- [ ] Seed production Sanity content (glossary, authors, blog) or ensure hardcoded fallbacks are launch-quality; fix `lib/ai/tools/escalate.ts:42` 404 link (`/{locale}/support/contact`).
- [ ] Cookie consent banner test: reject-all actually suppresses PostHog/Vercel analytics (verify network).

### 5.4 Launch-day operations
- [ ] Load/soak test staging: 100 concurrent product views + checkout burst; watch p95 latency, DB connections, rate limits.
- [ ] Error budget + on-call: Sentry alerts (error rate, webhook failures, payment failures), Upstash/Redis monitoring, Neon connection alerts.
- [ ] Runbook: rollback procedure, secret rotation, Stripe webhook replay, backup restore, incident contacts.
- [ ] Go/no-go checklist signed off (below).

---

## 8. Sequencing & dependencies

```
Phase 0 (security/legal P0) ─┬─> Phase 1 (money path) ──> Phase 5 (QA/e2e)
                             ├─> Phase 2 (appsec)       ──┘
                             └─> Phase 4 (env/db/obs)   ──┘
Phase 3 (performance) ──────────────────────────────────> Phase 5 (budgets)
```

- Phase 0 items 0.1–0.4 unblock everything else (auth route + env validation + deps).
- Phase 1 depends on 0.2 (env) and D2/D5 decisions.
- Phase 4.1 (migration re-baseline) must land **before** Phase 1 schema changes and Phase 3.6 indexes, otherwise they add to the drift.
- Phase 3 can run in parallel with Phases 1–2 after 4.1.

**Suggested 7-week calendar (one engineer):**

| Week | Focus |
|---|---|
| 1 | Phase 0: auth route + signup/reset + secrets/env + dependency upgrades |
| 2 | Phase 0 remainder + Phase 4.1 (migration baseline) |
| 3 | Phase 1: checkout/orders/webhooks + D5 VAT |
| 4 | Phase 2: authz/rate limits/AI/CSP |
| 5 | Phase 3: rendering + payload + 3D |
| 6 | Phase 3 remainder + Phase 4.2–4.4 (Sentry/health/deploy) |
| 7 | Phase 5: tests, CI, legal, content, QA + launch |

---

## 9. Launch gates (go/no-go)

A monitorable, binary checklist. **All must be true to launch.**

**Money**
- [ ] Stripe test-mode E2E passes end-to-end, including 3DS redirect → confirmation page.
- [ ] Server-computed shipping and VAT; tampering with checkout payload cannot reduce the total.
- [ ] Webhook replay produces exactly one stock decrement and one email.
- [ ] Every paid order row has `user_id` (if logged in) + address + payment reference.
- [ ] No oversell under concurrent checkout of the last unit (test).
- [ ] Confirmation page requires ownership (no order data to anonymous UUID holders).

**Security**
- [ ] `pnpm audit --prod`: 0 critical, 0 high.
- [ ] Registration/login/reset/session/logout all function and are rate-limited.
- [ ] No committed secrets; `AUTH_SECRET` rotated; env validation fails fast.
- [ ] Every `/api/admin/**` and `/api/referral/**` route requires a server-verified session/role.
- [ ] CSP has no `unsafe-inline` for scripts and analytics loads only after consent.
- [ ] Cron endpoints reject `Bearer undefined`.
- [ ] GDPR delete anonymizes data; export contains no password hash.

**Performance (Lighthouse CI on `/`, PDP, `/shop`, `/checkout`, mobile)**
- [ ] LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- [ ] Initial JS < 250 KB gzip on catalog routes; 3D/HDR not loaded until interaction.
- [ ] PDP and `/shop` served from cache (SSG/ISR) for anonymous visitors.

**Stability**
- [ ] Fresh DB rebuilt from migrations runs the full app; `db:migrate` in deploy.
- [ ] `/api/health` green; container healthcheck passes.
- [ ] Sentry captures a test error with readable stack.
- [ ] Automated backups exist and one restore drill has succeeded.
- [ ] CI green: typecheck, lint, unit, integration, e2e smoke, audit, Lighthouse budgets.

**Legal/UX**
- [ ] No fabricated reviews/testimonials anywhere.
- [ ] Real company identity (name, Y-tunnus, VAT, address) in the footer.
- [ ] Newsletter double opt-in and contact form actually work (or are hidden).
- [ ] Analytics claims match behavior; consent reset exists.
- [ ] Launch locales have full translation parity.

---

## 10. What is already good (protect, don't regress)

- **Type discipline** — strict tsconfig + `noUncheckedIndexedAccess`, zero `@ts-ignore`, only 3 `as unknown as` casts.
- **Security headers baseline** — HSTS preload, `nosniff`, frame policies, `frame-ancestors 'self'`, dev-only `unsafe-eval`, `poweredByHeader: false`.
- **Service-layer authz** — research plans re-check ownership; notifications are user-scoped; forum services re-derive membership; `getCurrentMember` fails closed; admin pages use `getAdminOrNull` and DB-backed guards.
- **Webhook signature verification** — Stripe raw-body `constructEvent`; Coinbase HMAC over raw bytes (needs timing-safe compare + idempotency, but the core is right).
- **Injection posture** — no `rehype-raw`; markdown escapes HTML; all `sql` templates parameterized; zod on most mutating routes.
- **AI guardrails** — input/output guardrails, read-only tools, admin tool filtering, server-side catalog lookups, consent-gated memory.
- **Cheap middleware** — locale-only, no auth/DB per request; correct matcher exclusions.
- **Heavy libs mostly lazy** — 3D scenes, PDF viewer, Studio already dynamic-import with `ssr:false` (the gaps are the default-on 3D tiles and eager chat/stripe mounts).
- **Fonts/images** — `next/font` Geist, AVIF/WebP, `next/image` everywhere, immutable `/_next/static` caching.
- **External-service fallbacks** — Sanity stub, in-memory search fallback, Sendcloud fallback rates, Resend skip-on-unconfigured, VIES timeout, sitemap tolerates Sanity outage.

---

## 11. Metrics to instrument and watch post-launch

| Metric | Target | Source |
|---|---|---|
| Core Web Vitals (LCP/INP/CLS) p75 | LCP < 2.5 s, INP < 200 ms, CLS < 0.1 | Vercel Speed Insights / Lighthouse CI |
| Server error rate (5xx) | < 0.1% of requests | Sentry |
| Checkout conversion (cart → paid) | baseline + alarm on > 20% drop | Stripe + analytics |
| Webhook processing failures | 0 missed events; alert on > 0 | Stripe dashboard + Sentry |
| p95 TTFB (PDP, `/shop`) | < 200 ms cached | Analytics |
| DB pool saturation | < 80% | Neon dashboard |
| AI cost / abuse | alert on 2× daily baseline | Upstash + MiniMax usage |
| Rate-limit 429 rate | stable, no legit-user spikes | Upstash |

---

*End of plan. Execute Phase 0 in week 1 — nothing else matters until auth exists, secrets are safe, dependencies are patched, and the database can be rebuilt. Each task should be its own PR with tests; each phase ends with the acceptance criteria in this document verified on staging.*
