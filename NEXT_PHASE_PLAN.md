# AverianLabs — Post-Audit Refinement & Implementation Plan
## Next-phase roadmap after bug audit + 3D carousel fixes

> Generated after full codebase audit (41 issues found, critical/high fixed) and 3D carousel refinement.

---

## Phase 0: Immediate Cleanup (1–2 days)

### 0.1 Remaining audit fixes
- [ ] **NewsletterForm.tsx** — the homepage inline form (`components/home/NewsletterForm.tsx`) still uses `setTimeout` fake submit. Wire it to `/api/newsletter`.
- [ ] **`ignoreBuildErrors: true`** — remove from `next.config.ts` once all TS errors are confirmed fixed. Gate CI on `tsc --noEmit`.
- [ ] **Order number collision** — add retry logic or switch to a DB sequence in `lib/orders/service.ts`.
- [ ] **`categories.parentId`** — add foreign key constraint in `db/schema/index.ts`.
- [ ] **`forumReports.reporterId`** — make nullable or change `onDelete` to `"restrict"` (currently `NOT NULL` + `set null`).
- [ ] **Cart drawer `<Link>` inside `<Button>`** — refactor to use `<Link>` as outer element.
- [ ] **`global-error.tsx`** — add `<head>` with charset + viewport meta.
- [ ] **Hardcoded strings** — move "Your cart is empty", "Free EU shipping over €150", etc. to i18n keys.

### 0.2 Environment hardening
- [ ] **Fail-fast on missing `DATABASE_URL`** — throw at module load in `lib/db.ts` instead of creating a broken client.
- [ ] **`.env.local` in `.gitignore`** — verify it's excluded; rotate `AUTH_SECRET` if it was ever committed.
- [ ] **CSP nonces** — replace `'unsafe-inline'` with per-request nonces for production.

---

## Phase 1: Stripe Elements Integration (3–5 days)

### 1.1 Client-side payment
- [ ] Install `@stripe/react-stripe-js` + `@stripe/stripe-js`.
- [ ] Create `PaymentStep` component that renders `<Elements>` + `<PaymentElement>`.
- [ ] Load Stripe via `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)`.
- [ ] On "Place order" click: call `stripe.confirmPayment({ clientSecret, confirmParams: { return_url } })`.
- [ ] Handle `redirect: "if_required"` for card payments that don't require 3DS redirect.

### 1.2 Payment intent with shipping
- [ ] Update `/api/checkout` to accept `shippingAddress` and pass to Stripe's `shipping` parameter (required for fraud detection).
- [ ] Include `items` in PaymentIntent metadata (for webhook stock decrement).

### 1.3 Apple Pay / Google Pay
- [ ] Use `<PaymentRequestButtonElement>` from `@stripe/react-stripe-js`.
- [ ] Feature-detect `paymentRequest.canMakePayment()`.

### 1.4 Crypto checkout
- [ ] Create `/api/checkout/crypto` that calls Coinbase Commerce `charges.create()`.
- [ ] Return hosted checkout URL; redirect user.
- [ ] Webhook already wired — just verify `charge:confirmed` flow.

---

## Phase 2: Shipping Integration (2–3 days)

### 2.1 Sendcloud API
- [ ] Create `lib/shipping/sendcloud.ts` with rate calculation.
- [ ] `/api/shipping/rates` — accepts address + cart, returns carrier options with ETAs.
- [ ] Replace hardcoded `SHIPPING_OPTIONS` in checkout with live rates.

### 2.2 Label generation
- [ ] On `payment_intent.succeeded` webhook: call Sendcloud to create shipment + get label URL.
- [ ] Store tracking number + label URL in `shipments` table.
- [ ] Send tracking email via Resend.

### 2.3 Posti direct (Finland)
- [ ] Posti API integration for domestic Finnish shipments.
- [ ] Fallback to Sendcloud for other EU countries.

---

## Phase 3: Email System (2–3 days)

### 3.1 Resend setup
- [ ] Install `resend` + `@react-email/components`.
- [ ] Create email templates:
  - `OrderConfirmation` — order number, items, total, COA download link.
  - `ShippingConfirmation` — tracking number, carrier, ETA.
  - `GdprExportReady` — download link for data export.
  - `GdprDeleteConfirm` — confirmation link with token.
  - `NewsletterWelcome` — double opt-in confirmation.

### 3.2 Transactional triggers
- [ ] `payment_intent.succeeded` → send order confirmation.
- [ ] Shipment created → send shipping confirmation.
- [ ] GDPR export complete → send download link.
- [ ] GDPR delete request → send confirmation email (not API response).

### 3.3 Newsletter
- [ ] Create `newsletter_subscribers` table.
- [ ] `/api/newsletter` → insert into table + send welcome email.
- [ ] Double opt-in flow with confirmation token.
- [ ] Unsubscribe page at `/[locale]/unsubscribe/[token]`.

---

## Phase 4: VIES VAT Validation (1 day)

### 4.1 Server-side validation
- [ ] Create `lib/vat/vies.ts` — SOAP client for EU VIES service.
- [ ] `/api/vat/validate` — accepts VAT ID, returns `{ valid, companyName, country }`.
- [ ] Call from checkout address step (debounced).
- [ ] Store validated VAT ID on order for B2B invoices.

### 4.2 Tax calculation
- [ ] For B2B with valid VAT ID: zero-rate VAT.
- [ ] For B2C: apply 24% Finnish VAT (or country-specific rate via Stripe Tax).

---

## Phase 5: Account & Rewards (3–4 days)

### 5.1 Order history enhancements
- [ ] Order detail page at `/[locale]/account/orders/[id]`.
- [ ] Show line items, COA download links, shipment tracking.
- [ ] Reorder button (adds items back to cart).

### 5.2 COA library
- [ ] `/[locale]/account/coa` — list of COAs from purchased orders.
- [ ] Auto-populate when order is marked paid.
- [ ] PDF download + share link.

### 5.3 Subscriptions
- [ ] `subscriptions` table already in schema.
- [ ] UI for setting up recurring orders (every N weeks).
- [ ] QStash cron to process due subscriptions.
- [ ] Stripe recurring payment via `stripe.subscriptions.create()`.

### 5.4 Rewards engine
- [ ] `rewards_accounts` + `rewards_ledger` tables in schema.
- [ ] Points earned on purchase (1 point per €1 spent).
- [ ] Tier thresholds: Apex (0), Crystal (500), Aurora (2000).
- [ ] Points redemption at checkout (slider).
- [ ] Referral link generation + tracking.

---

## Phase 6: Content & SEO (2–3 days)

### 6.1 Blog enhancements
- [ ] Wire Sanity blog posts to the blog index (currently using hardcoded fallback).
- [ ] Author pages with bio + post list.
- [ ] Table of contents from headings.
- [ ] Reading progress bar.
- [ ] Related products sidebar (from Sanity `peptideMonograph` references).

### 6.2 Peptide calculator
- [ ] Client-side reconstitution calculator (inputs: mass, water volume, desired dose, syringe type).
- [ ] Save scenarios to account.
- [ ] Share calculation via URL params.

### 6.3 SEO
- [ ] Generate `sitemap.xml` from product + blog data.
- [ ] `robots.txt` with locale-specific rules.
- [ ] JSON-LD `Product` schema on PDP with `aggregateRating`.
- [ ] OG image generation via `next/og` for products + blog posts.

---

## Phase 7: Search (1–2 days)

### 7.1 Meilisearch integration
- [ ] Create Meilisearch index for products.
- [ ] Sync products on build + on stock change.
- [ ] Faceted search: category, purity, price, stock.
- [ ] Instant search in command palette (Cmd+K).

### 7.2 Fallback
- [ ] In-memory search when Meilisearch not configured (current behavior).
- [ ] Graceful degradation with clear "search unavailable" message.

---

## Phase 8: Admin Panel (2–3 days)

### 8.1 Order management
- [ ] `/[locale]/admin/orders` — list all orders with filters (status, date, email).
- [ ] Order detail view with items, payment, shipment.
- [ ] Manual "mark paid" with audit log.
- [ ] Refund via Stripe API.

### 8.2 Inventory management
- [ ] `/[locale]/admin/inventory` — product + vial stock levels.
- [ ] Low-stock alerts.
- [ ] Batch management (add new batch, upload COA PDF).

### 8.3 Customer management
- [ ] `/[locale]/admin/customers` — user list with order history.
- [ ] GDPR export/delete from admin.

---

## Phase 9: Performance & Polish (2–3 days)

### 9.1 Performance
- [ ] Code-split all admin pages.
- [ ] Lazy-load 3D components on scroll (IntersectionObserver).
- [ ] Image optimization: product images with AVIF/WebP.
- [ ] Bundle analysis + size budget enforcement in CI.

### 9.2 Accessibility
- [ ] Run axe-core audit on all pages.
- [ ] Fix all `noArrayIndexKey` warnings (use stable keys).
- [ ] Keyboard navigation for 3D carousel (already partially done).
- [ ] Screen reader testing with NVDA/VoiceOver.

### 9.3 Motion
- [ ] `prefers-reduced-motion` gate on all animations.
- [ ] Page transitions with `framer-motion`.
- [ ] Scroll-triggered animations (Reveal component already exists).

### 9.4 Dark mode
- [ ] Verify all components work in dark mode.
- [ ] Add theme toggle to header.
- [ ] Persist theme preference in cookie.

---

## Phase 10: Testing & CI (2–3 days)

### 10.1 Unit tests
- [ ] Test `lib/orders/service.ts` (createOrder, decrementStock, etc.).
- [ ] Test `lib/checkout/store.ts` (state transitions).
- [ ] Test `lib/shipping/` (rate calculation).
- [ ] Test `lib/vat/` (VIES validation).

### 10.2 E2E tests
- [ ] Full checkout flow: browse → add to cart → checkout → payment → confirmation.
- [ ] Forum: create thread → reply → react → report.
- [ ] Account: login → view orders → GDPR export → delete.

### 10.3 Visual regression
- [ ] Playwright visual tests for key pages.
- [ ] 3D carousel screenshot comparison.

### 10.4 CI pipeline
- [ ] GitHub Actions: typecheck → lint → test → build → Lighthouse CI.
- [ ] Block merge on failing checks.

---

## Priority Order

| Priority | Phase | Effort | Impact |
|----------|-------|--------|--------|
| **P0** | Phase 0 (cleanup) | 1–2d | Stability |
| **P1** | Phase 1 (Stripe Elements) | 3–5d | Revenue |
| **P1** | Phase 3 (Email) | 2–3d | UX/Compliance |
| **P2** | Phase 2 (Shipping) | 2–3d | Operations |
| **P2** | Phase 4 (VIES) | 1d | B2B compliance |
| **P3** | Phase 5 (Account/Rewards) | 3–4d | Retention |
| **P3** | Phase 6 (Content/SEO) | 2–3d | Growth |
| **P4** | Phase 7 (Search) | 1–2d | UX |
| **P4** | Phase 8 (Admin) | 2–3d | Operations |
| **P5** | Phase 9 (Polish) | 2–3d | Quality |
| **P5** | Phase 10 (Testing) | 2–3d | Reliability |

**Total estimated effort: 21–32 days**

---

## Technical Debt to Address Alongside

1. **Static product data** — `lib/products/data.ts` is 838 lines of hardcoded products. Migrate to DB-backed with ISR.
2. **Sanity CMS** — Blog/glossary fall back to hardcoded data. Wire up properly with environment variables.
3. **R2 file storage** — Upload/presigned-URL code missing. Only resolution exists.
4. **Sentry** — DSN configured but SDK not initialized. Add `sentry.client.config.ts` + `sentry.server.config.ts`.
5. **PostHog/Plausible** — Analytics providers exist but keys are empty. Configure for production.
6. **Meilisearch** — Not integrated. Product search is in-memory only.
7. **Resend** — No email sending. Transactional emails are not implemented.
8. **QStash** — Scheduled jobs (price sync, sitemap regen, subscription processing) not implemented.

---

*End of plan. Execute phases in priority order. Each phase should be a separate PR with tests.*
