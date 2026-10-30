# Development roadmap — what to refine next

Date: 23 October 2026 · Status: **waves 1, 3 and 4 executed; wave 2 partly executed** · Scope: the whole `averianlabs-web` application

Companions: `docs/STORE_HARDENING_2026-10-23.md` (what was just delivered, and what this roadmap changed),
`docs/STORE_AND_TELEGRAM_CRYPTO_PLAN_2026-10-23.md` (the store plan),
`docs/SHOP_REBUILD_2026-10-20.md` (the shop roadmap),
`docs/RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md` (the operations runbook).

---

## 0. What this plan is based on

Every item below was checked against the running application or the source, not
assumed. The findings that shaped the ordering:

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | **Nothing schedules the maintenance cron on the host that serves the site.** `netlify.toml` declares no scheduled function. The only scheduler is `.github/workflows/maintenance.yml`, gated on `if: vars.MAINTENANCE_BASE_URL != ''` — a repository variable that has to be set by hand. | `netlify.toml` (no `[functions.*]` block); `.github/workflows/maintenance.yml:9` |
| 2 | **The Telegram outbox has exactly two drain points and both are cron routes.** If the cron does not run, the bot never sends the invoice or the payment confirmation. | `app/api/cron/crypto/route.ts:21`, `app/api/cron/maintenance/route.ts:21` — the only two callers of `deliverTelegramOutbox` |
| 3 | **The order receipt is enqueued but only delivered when something drains the outbox.** The cron does it; so do six unrelated user-facing routes (register, contact, newsletter, partner, GDPR) that happen to call `deliverEmailOutbox()`. A customer who only ever pays waits for the cron. | `lib/orders/service.ts` `queueReceipt`; the six `deliverEmailOutbox()` call sites |
| 4 | **The admin "Refund" button does not refund.** `markOrderRefunded` flips a database status. There is no `stripe.refunds.create` anywhere in the repository, no stock restore, and no customer email. | `lib/orders/service.ts:513-525`; `lib/payments/stripe.ts` exports only `stripe()` |
| 5 | **All 15 end-to-end failures were one environment variable.** `TEST_DATABASE_URL` is not in `.env.local` or `.env.example`, and Playwright does not load either. With it set, the suite goes from *15 failed / 129 passed* to *3 failed / 143 passed*. | `tests/helpers/test-database.ts:4-8`; `playwright.config.ts:46` |
| 6 | **The suite is flaky even with the variable set.** The register endpoint allows 5 requests per hour per IP (`app/api/auth/register/route.ts:24`); eight parallel workers share one IP, so tests fail with `429`. | confirmed by running the suite: `Received: 429` |
| 7 | **No shipping label is ever created.** `lib/shipping/index.ts` calls only the Sendcloud *rates* endpoint. `markOrderShipped` records carrier, service and tracking number that an operator typed by hand. `SENDCLOUD_WEBHOOK_SECRET` is declared and never read. | `lib/shipping/index.ts:17-56`; `components/admin/order-actions.tsx:41-43`; `lib/env.ts:50` |
| 8 | **There is no customer-facing returns or refund-request flow.** `/support/shipping-returns` is a static text page. There is no returns API, no returns table, no request form. The only route is the admin refund, which does not move money. | `app/[locale]/support/shipping-returns/page.tsx`; `components/product/PolicyPage.tsx` |
| 9 | **The referral flow promises a €15 discount that is never applied.** `referral_redemptions.referred_discount_cents` is inserted and never read; `status` stays `"pending"` forever; no approval job exists. The `/rewards` page simultaneously says referrals are *not* available at checkout. | `app/api/referral/redeem/route.ts:47-74`; `research.rewardsIntro` in `messages/en.json` |
| 10 | **`email_digest` is a user-facing toggle that does nothing**, the notification bell the code comment promises does not exist, three of five notification kinds are never emitted, and the notifications UI renders two kinds that are not in the TypeScript union. | `lib/notifications/service.ts:4-5, :12`; `app/[locale]/account/notifications/page.tsx:78-81` |
| 11 | **Meilisearch is an unwired dependency.** The public search path filters the catalogue in memory; the only indexer is `scripts/search-index.ts`, which is not a package script, not in CI and not on a cron. Four env vars exist for it. | `lib/search/meilisearch.ts:60-100` vs `:44-59` |
| 12 | **The Lighthouse configuration mostly warns.** Only `accessibility` is `error`; performance, best-practices and SEO are `warn`. The stored baseline covers 4 routes (`/en`, `/en/about`, `/en/quality`, `/en/shop`) while the config collects 7 different ones, and it is dated 13 October. `pnpm check:lh` is not in CI. `pnpm test:a11y` is not in CI. Vitest coverage thresholds are declared for two files and never enforced. | `.lighthouserc.json:23-53`; `.lighthouseci/baseline/`; `.github/workflows/ci.yml` |
| 13 | **The homepage is at 97.4 % of its bundle budget** (292.2 of 300 KiB gzip). Only 9 of ~60 routes have a budget and CSS is not measured at all. | `scripts/check-bundle-size.mjs:17-27` and a live run |
| 14 | **Twenty-one schema columns and two tables are dead**, including `rewards_accounts.points_balance`, `newsletter_subscribers.unsubscribed_at` (unsubscribes are never recorded), `support_tickets.closed_at`, `batches.coa_pdf_r2_key`, and the whole `banned_countries` and `coa_tests` tables. | `db/schema/index.ts`; no application code references them |
| 15 | **Twenty-eight of fifty-one `lib/` directories have no tests at all**, including every file in `lib/orders/` — the whole fulfilment state machine. All ten `/admin/*` routes have zero end-to-end coverage, including the order console just built. | directory listing |
| 16 | **`ProductFAQ` escapes only the first `<`** (`String.replace` with a string pattern) where `JsonLd` correctly uses `replaceAll`. A second `<` in the payload would not be escaped. | `components/product/ProductFAQ.tsx:29` vs `components/seo/JsonLd.tsx:11-13` |
| 17 | **The CSP allows a Sendcloud host the code never calls** (`api.sendcloud.com`) and not the one it does (`panel.sendcloud.sc`). Server-side fetches are not affected by CSP, so this is a latent inconsistency rather than a live break — but the crypto explorers (`mempool.space`, `api.trongrid.io`, `api.etherscan.io`) are not listed either, and any future browser-side call would be blocked. | `next.config.ts:54` vs `lib/shipping/index.ts:15` |

---

## Execution summary

| Wave | Item | State |
| --- | --- | --- |
| 1 | 1.1 Netlify scheduled functions | **Done.** `netlify/functions/cron-maintenance.mts` and `cron-crypto.mts`, scheduled in `netlify.toml`. Both routes are budgeted below Netlify's 30-second limit and stop early rather than being killed. The GitHub workflow stays as a fallback. |
| 1 | 1.2 Real refunds | **Done.** `lib/orders/refund.ts`. The method has to be named: `stripe` (through the provider), `crypto` (the outbound transaction hash) or `manual` (a reason). The stock comes back, the customer is emailed, and a second press does not refund twice. |
| 1 | 1.3 Local test setup | **Done.** `TEST_DATABASE_URL` is documented and `playwright.config.ts` loads `.env.local` and refuses to start without it. The register limit no longer fires mid-suite. |
| 2 | 2.3 Referral programme | **Done.** The discount is a real promotion that reaches the quote, and the referrer's credit is settled when the order is paid. |
| 2 | 2.4 Notifications | **Done.** A forum reply notifies the thread author, the header has the bell the code comment promised, the kind union matches what is written, and the "email digest" switch now sends a digest. |
| 2 | 2.1 Returns and refund requests | **Not done.** It needs a returns table, a customer request flow, an approval queue and matching legal copy. The customer-facing part is the visible one and it is not small. |
| 2 | 2.2 Shipping labels | **Not done.** The Sendcloud parcel and label API needs an account to test against, and the manual tracking-number entry stays in place. |
| 3 | 3.1 Bundle budgets | **Done.** Every route has a budget now, not nine of sixty. CSS is still not measured. |
| 3 | 2 Lighthouse and accessibility in CI | **Done.** The categories are errors rather than warnings, the baseline matches the configured routes, and `check:lh` and `test:a11y` run in CI. |
| 3 | 3.3 Coverage | **Done.** The coverage provider was never installed, so the declared thresholds had never applied. It is installed now, `pnpm test:coverage` runs in CI, and the thresholds are set to what is actually covered. |
| 3 | 3.4 Admin end-to-end coverage | **Done.** `tests/admin-console.spec.ts` covers the order console, the inventory panel and the crypto routes. |
| 4 | 4 Debt | **Done.** The newsletter now has a working unsubscribe, `ProductFAQ` escapes every `<`, the CSP names the hosts the code actually calls, and the referral rows no longer block an order from being deleted. |

Two defects were found while doing this work and fixed: the vial sizes were rendered in
whatever order the database returned them, and a referral redemption blocked its order
from being deleted.

**The end-to-end browser suite went from 15 failures to none.** Twelve of those were a
missing environment variable and three were a rate limit firing mid-suite.

---

## 1. The plan

Four waves. Each wave is independently shippable and each ends with something that
can be demonstrated. The order is by **risk**, not by effort: everything in wave 1 is
either money that does not move or a service that does not run.

### Wave 1 — Make the operations actually run

> *Nothing in this wave is a feature. It is the difference between a store that
> functions and one that appears to.*

#### 1.1 Schedule the cron where the site is actually served

**The problem.** The site is served from Netlify (`RUNBOOK.md`: "the existing online
site is averianlabs-demo.netlify.app, on Netlify"). Netlify has no scheduled
function, and the GitHub Actions workflow that calls `/api/cron/maintenance` is gated
on a repository variable. If that variable is unset, **the Telegram bot never
delivers anything** and order receipts wait indefinitely.

**The fix.** Add a Netlify scheduled function. The cron route itself authenticates
with `Authorization: Bearer $CRON_SECRET`, and a Netlify scheduled invocation carries
no custom headers, so the schedule needs a thin wrapper that calls the route with the
secret from the environment:

```
netlify/functions/cron-maintenance.mts   → GET  /api/cron/maintenance
netlify/functions/cron-crypto.mts         → GET  /api/cron/crypto
```

```toml
# netlify.toml
[functions."cron-maintenance"]
  schedule = "*/5 * * * *"
[functions."cron-crypto"]
  schedule = "*/2 * * * *"
```

Both wrappers read `URL` (their own origin) and `CRON_SECRET` from the Netlify
environment and `fetch` the route with the bearer header. Keep the GitHub workflow as
a second scheduler.

**Two things to get right.**

- Netlify scheduled functions have a **30-second execution limit**
  (https://docs.netlify.com/build/functions/scheduled-functions). Both cron routes
  currently declare `maxDuration = 60`. Either lower them or split the work; the
  crypto watcher must also stop before the limit rather than being killed mid-scan.
- The crypto watcher needs its own schedule, not the maintenance one. Two minutes is
  the right cadence for a customer waiting to be told their payment landed.

**Verified by.** A deploy where the function appears in the Netlify UI with a
`Scheduled` badge, and a deliberately enqueued order receipt that arrives without
any other traffic.

#### 1.2 Make "Refund" refund

**The problem.** An operator clicks *Refund* in the admin console. The order's status
becomes `refunded`. **The customer keeps their money.** There is no
`stripe.refunds.create` call anywhere in the repository, no stock restoration, no
customer email, and no record of the provider's refund reference.

**The fix.** A real refund service, `lib/orders/refund.ts`:

```ts
export async function refundOrder(orderId: string, actor: AdminMember): Promise<{
  provider: "stripe" | "crypto" | "manual"
  reference: string | null
}>
```

- Stripe: `stripe().refunds.create({ payment_intent: order.stripePaymentIntentId })`.
  Store the refund id on the order (`paymentProviderFeeCents` and `exchangeRateEurPerUnit`
  are already free columns; add `refundReference`).
- Crypto: there is no reversal. The operator must supply a transaction hash for the
  outbound transfer, and the order records it. Do **not** pretend a crypto payment
  can be undone.
- Manual: when the payment provider is not configured, record the refund as manual
  with the operator's reason, and require that reason. Never silently succeed.
- Restore the inventory hold, and email the customer.
- A refund must be idempotent: a second press on the same order must return the
  existing refund rather than paying twice.

**This is the single most dangerous item in the plan.** Until it is done, the
*Refund* button in the admin console should be hidden, because an operator who
presses it will believe the customer has been paid back.

**Verified by.** An integration test that creates a Stripe test payment, refunds it,
and asserts the provider was called once, the stock came back, the customer email
was queued, and a second call is a no-op.

#### 1.3 Make the local test suite runnable and non-flaky

**The problem.** Twelve of the fifteen end-to-end failures were one missing
environment variable. The remaining three are flakiness: the register endpoint
allows five requests an hour per IP, and eight Playwright workers share one IP.

**The fix.**

1. `TEST_DATABASE_URL` goes in `.env.example`, `README.md` and `RUNBOOK.md` — it is
   currently documented in exactly one place
   (`docs/RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md:61`).
2. `playwright.config.ts` loads `.env.local` itself, so `pnpm test:e2e` works from a
   clean checkout without the operator exporting variables by hand. It must also
   **fail loudly** if `TEST_DATABASE_URL` is missing, rather than letting every
   browser test die with "Browser mutations require matching isolated DATABASE_URL".
3. The rate limit must not fire during a test run. Either raise the register limit
   when `NODE_ENV === "test"`, or give the limit a key that separates test runs.
   A rate limiter that breaks the suite gets disabled by whoever hits it first.

**Verified by.** `pnpm test:e2e` from a clean shell with only `.env.local` present:
no `429`, and the same result twice in a row.

### Wave 2 — Close the gaps where money or service is promised

#### 2.1 A customer-facing returns and refund request

The only way for a customer to get a return handled today is a contact form. Build:

- `returns` table: order, customer, reason, items, status (`open`, `approved`,
  `rejected`, `received`, `refunded`), the operator's decision, the outcome.
- A page on the order confirmation and the account order list: *"Request a return"*,
  pre-filled from the order.
- `POST /api/orders/:id/return-request`, authenticated by order ownership or the
  order access token.
- An admin queue next to the order console: approve, reject with a reason, mark
  received.
- On approval, the refund runs through 1.2 — the request and the refund are one flow,
  not two disconnected buttons.
- The legal copy (`research.shippingReturns*`) must describe what actually happens,
  including who pays the return shipping and the refund window.

#### 2.2 Shipping labels

Add the missing Sendcloud surface: `createParcel`, `createShipment`, `getLabel` and
`getTracking`. The admin "Ship" action then becomes *"Create label"* — the operator
picks a service, the app creates the parcel, prints the label, and the tracking
number is written by the app rather than typed. Keep manual entry as a fallback for
carriers Sendcloud does not cover.

Also: `SENDCLOUD_WEBHOOK_SECRET` is declared and never read. Either implement the
webhook receiver (`app/api/webhooks/sendcloud/route.ts`, mirroring the Stripe one) or
remove the variable. A declared secret that nothing reads is a false promise of
security.

#### 2.3 Either wire the referral discount or delete the promise

Three coherent options, and the choice is a business one:

- **Wire it.** A pending referral is settled when the referred customer's order is
  paid: `referred_discount_cents` becomes a promotion applied at checkout, and
  `referrer_credit_cents` becomes a credit on `rewards_accounts.points_balance`.
  That needs a checkout integration (a promotion kind that reads the redemption) and
  a settlement job.
- **Simplify.** Keep the referral code generator as a tracking link only — no
  discount, no credit — and delete the two money columns. Update the copy.
- **Remove.** Delete `rewards_accounts` and `referral_redemptions` and the two API
  routes.

What must not survive: an API that tells a customer *"€15 discount will be applied at
checkout"* while nothing applies it, next to a page saying referrals are not
available at checkout.

#### 2.4 Make the notification preferences true

`email_digest` is offered in the account settings and does nothing. Three options:
implement the digest, hide the toggle, or mark it *"coming soon"*. Then:

- Emit the three notification kinds that are never emitted (`reply`, `mention`,
  `system`) — a forum reply currently produces no notification at all.
- Add the notification bell the code comment promises, or delete the comment.
- Reconcile the `NotificationKind` union with what the UI renders: the page renders
  `moderation_approved` and `moderation_removed`, which are not in the union and are
  written by a direct insert that bypasses `emitNotification`.

### Wave 3 — Make the checks mean something

A check that cannot fail is worse than no check, because it is read as assurance.

#### 3.1 Bundle budgets

The homepage is at 97.4 % of its budget, so the next feature breaks the build. Either
raise the homepage budget (with a note on why) or find the weight — the 3D hero and
the search are the likely candidates. Then:

- Extend the budget table to every route, not 9 of ~60.
- Measure CSS as well as JS; a CSS budget is the cheaper half of the problem.
- Budget the *total* chunk weight, not just the per-route figure.

#### 3.2 Lighthouse and accessibility in CI

- Promote the performance, best-practices and SEO assertions from `warn` to `error`,
  or state in the file exactly why a threshold is advisory.
- Replace the stale baseline (4 routes, 13 October) with one matching the 7 routes
  the config names. The four recorded `unused-javascript` failures should be resolved
  or accepted explicitly.
- Add `pnpm check:lh` and `pnpm test:a11y` to `.github/workflows/ci.yml`.
- Add per-metric thresholds (LCP, TBT, CLS, FCP). `scripts/performance-smoke.mjs`
  already collects them and asserts nothing.

#### 3.3 Coverage that is enforced

`vitest.config.ts` declares thresholds for two files and `package.json` runs
`vitest run` without `--coverage`, so they never apply. Either enforce them, or
delete them and stop implying a floor that does not exist.

The real gap is not the percentage but the shape: `lib/orders/`, `lib/checkout/`,
`lib/email/`, `lib/crypto/`, `lib/telegram/` and `lib/gdpr/` have no unit tests. The
fulfilment state machine deserves unit tests on the transition table itself, separate
from the integration suite.

#### 3.4 End-to-end coverage where the money is

All ten `/admin/*` routes have zero end-to-end coverage, including the order console
and the inventory panel just built. Add specs for: mark packed → ship with a tracking
number → the customer sees the status; the stock adjustment; the manual deposit match
settles the order; and the crypto routes (`/api/crypto/chains`,
`/api/checkout/crypto-session`, `/api/telegram/webhook`).

#### 3.5 Decide about Meilisearch

The search path filters in memory and is correct for a catalogue this size. The
Meilisearch client, the indexer script and four env vars are unused weight. Either
wire the index and the read path, or remove the dependency. Do not leave an
integration that a future developer assumes is live.

### Wave 4 — Remove the debt that will not hurt if it waits

- **Dead schema.** Two dead tables (`banned_countries`, `coa_tests`) and 21 dead
  columns. Most are harmless, but three are not: `newsletter_subscribers.unsubscribed_at`
  is never written, so an unsubscribe is not recorded — that is a compliance gap, not
  just a dead column; `support_tickets.closed_at` is never set, so tickets never
  close; and `partner_applications.status` never leaves `pending`, so an application
  can never be reviewed through the application. Fix those three, migrate the rest
  away, and leave the harmless ones alone until a natural migration.
- **`partner_applications.status` never transitions.** There is an application form
  and no review surface. Either build the review or say plainly that applications are
  handled by email.
- **Untested modules.** Add unit tests for `lib/orders/status.ts` (the transition
  table, exhaustively), `lib/checkout/`, `lib/email/`, `lib/security/rate-limit.ts`
  (the fail-open behaviour), and `lib/auth/`.
- **`ProductFAQ` escaping.** Change `String.replace(/</g, …)` to `replaceAll`, matching
  `JsonLd.tsx`. It is a one-character fix to a real inconsistency.
- **The CSP host list.** Replace `api.sendcloud.com` with `panel.sendcloud.sc`, and
  add the chain explorers the crypto watchers call. Neither breaks anything today;
  both would break the first time someone moves a call to the browser.

---

## 2. Deliberately not in this plan

| Item | Why not |
| --- | --- |
| EU/EEA checkout expansion | Phase 8 of the store plan. It is a legal and logistics project, not a code project, and it depends on decisions that have not been made (which countries, OSS reverse charge, who files the returns). |
| Real product photography | Explicitly out of scope in the Master Plan. It needs a supplier and a budget, not a branch. |
| Loosening the specifications gate | The product page shows *"Product specifications are not yet confirmed"* even though the CAS number, formula, molecular weight and sequence are in the database. That is the verified-only gate working as designed: specifications are published only once someone has checked them against a source document. Changing it is a compliance decision with a human name attached, not a copy change. |
| A standalone Telegram worker process | The webhook route is sufficient while the schedule in 1.1 works. A worker buys delivery guarantees and lower latency; it also introduces a process to run and monitor. Revisit if the webhook route proves flaky in production. |
| Rebuilding the AI assistant | Twenty tools, a real RAG path and real guardrails. The limitation is a missing API key, not a missing feature. |

---

## 3. Decisions that need a human

1. **Wallet custody for the crypto checkout.** The shared-address design with a
   fee-tolerant amount match is the pragmatic first version; unique HD addresses per
   order are strictly better and need key management someone has to own.
2. **Which chain.** USDT-TRC-20 for fees, Bitcoin for expectation. Both are
   implemented.
3. **Does the referral programme exist?** Wire it, simplify it, or remove it — but
   the copy must tell the truth either way.
4. **Where does the refund money come from for crypto payments?** A crypto transfer
   cannot be reversed. The operational rule needs to be written down before the
   button is enabled.
5. **Who approves a return?** The flow in 2.1 needs an owner, and the legal copy
   needs to match what that owner will actually do.
6. **Is the `/rewards` page a product decision or a placeholder?** It currently
   contradicts the referral API.

---

## 4. Suggested order of work

| Wave | Item | Size | Depends on |
| --- | --- | --- | --- |
| 1 | 1.3 Local test setup and rate limit | S | — |
| 1 | 1.1 Netlify scheduled functions | S | 1.3 (so the suite is green first) |
| 1 | 1.2 Real refunds | M | — |
| 2 | 2.4 Notification preferences | S | 1.1 (the digest needs the outbox to run) |
| 2 | 2.2 Shipping labels | M | 1.1 |
| 2 | 2.1 Returns and refund requests | L | 1.2 |
| 2 | 2.3 Referral decision | S–M | A business decision |
| 3 | 3.3 Coverage | M | — |
| 3 | 3.4 Admin end-to-end coverage | M | — |
| 3 | 3.2 Lighthouse and a11y in CI | S | — |
| 3 | 3.1 Bundle budgets | S | A decision on the homepage budget |
| 3 | 3.5 Meilisearch decision | S | — |
| 4 | 4 Debt removal | S–M | — |

**Wave 1 is roughly three days of work and it is the difference between a store that
functions and one that appears to.** It should start first.
