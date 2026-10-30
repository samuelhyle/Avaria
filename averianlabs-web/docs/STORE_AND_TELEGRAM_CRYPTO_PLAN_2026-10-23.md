# Store hardening + Telegram crypto checkout — plan

Date: 23 October 2026 · Status: **phases 1–6 delivered — see `docs/STORE_HARDENING_2026-10-23.md`** · Scope: `averianlabs-web` storefront + checkout

Companion documents: `docs/STORE_HARDENING_2026-10-23.md` (delivery ledger and
operations), `docs/SHOP_REBUILD_2026-10-20.md` (shop roadmap, Phases A–L),
`docs/RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md` (canonical operations runbook).

> **Status.** Phases 1–7 of the roadmap below are implemented and verified; phase 8
> (EU expansion) is not started. The findings in §2 were confirmed against a live
> database and are the reason the roadmap is ordered the way it is. A review pass
> over the first delivery found and fixed four further defects, including deposits
> being matched before the chain had confirmed them — see §5 of the delivery
> document.

---

## 0. Summary

The storefront looks finished and the code is unusually disciplined (idempotent orders,
quote hashing, inventory reservations, email outbox, i18n parity across 5 locales). But
walking the buying flow end-to-end against a live database shows **the store cannot
complete a purchase**, and the Telegram/crypto request cannot be built on top of it as-is.

Three things must happen, in this order:

1. **Unbreak the checkout.** The cart page has no "proceed to checkout" control — the
   customer can fill a cart and then has nowhere to go. This is a one-line fix for a
   zero-revenue bug.
2. **Give the server a cart and an order lifecycle.** Telegram cannot read a browser's
   `localStorage`. There is no server-side cart, no admin order queue, and `shipped` /
   `delivered` are states that **no code path can reach**.
3. **Then** add the Telegram crypto checkout, which is a well-defined feature once 1 and 2
   exist.

The Telegram design below is deliberately built on the existing primitives
(`quoteCart`, `markOrderPaid`, `enqueueEmail`, `webhook_events`, `/api/cron/maintenance`)
rather than inventing parallel machinery.

---

## 1. How the store was tested

Local stack brought up against the repo's own fixtures:

```bash
docker start averianlabs-postgres                       # pgvector/pgvector:pg16, :5434
DATABASE_URL="postgres://averianlabs:averianlabs@localhost:5434/build" pnpm db:migrate
DATABASE_URL="…/build" pnpm db:seed                     # 15 reference SKUs as drafts
DATABASE_URL="…/build" TEST_DATABASE_URL="…/build" pnpm tsx scripts/seed-test-commerce.ts
pnpm dev                                                 # http://localhost:3000
```

`scripts/seed-test-commerce.ts` creates `qa-peptide` / `qa-water` with `purchase_mode=direct`,
stock 20, a released batch and a public CoA — the only two SKUs that are actually buyable
locally. Without them the "buy" path cannot be exercised at all, because every seeded SKU is
`status=draft` with `purchase_mode=unavailable` and **zero batches**.

Driven with Playwright (Chromium) against the live dev server, plus direct `curl` probes of
`/api/checkout/quote`, `/api/checkout`, `/api/orders/{id}/status`.

---

## 2. Findings

### P0 — blocks revenue

| # | Finding | Evidence |
|---|---|---|
| **P0-1** | **The cart page has no checkout CTA.** `components/cart/CartView.tsx:290` renders `<CheckoutSummary locale={locale} />` with no `ctaHref`, and `components/checkout/CheckoutSummary.tsx:68` only renders the link `{ctaHref && quote ? … : null}`. `ctaHref`/`ctaLabel` are dead props — no caller anywhere passes them. A grep for `checkout/(email\|address\|shipping\|payment)` across all `*.tsx` finds **zero** links. The drawer links to `/checkout/cart`; the cart page links nowhere. **The customer fills a cart and is stuck.** | Live DOM: cart page links are only product links + "Browse products". No `checkout/email` link exists in the rendered site. |
| **P0-2** | **Promo codes are a fake that lies.** `components/cart/PromoCodeInput.tsx` accepts `AVARIA10`, `RESEARCH`, `FREESHIP`, shows "applied / Applied at checkout" and a success toast — then changes **nothing**. The price is untouched. The component's own comment says it is a screenshot stub. This is a misleading-commercial-practice exposure (FI/EU consumer law) and it also breaks the "one authoritative total" invariant the Telegram flow depends on. | `PromoCodeInput.tsx:24-43` — `setTimeout` + `setApplied`, no pricing call. |
| **P0-3** | **There is no server-side cart.** `lib/cart/store.ts` is Zustand + `localStorage` only. The server has no notion of a cart, so nothing outside the browser can read one. A Telegram bot cannot "gather the shopping cart" without this. | `lib/cart/store.ts`; the AI assistant has the same problem and works around it by shipping a cart snapshot in every chat request (`app/api/ai/chat/route.ts` `bodySchema.cart`). |
| **P0-4** | **Orders can never be fulfilled.** `shipped` and `delivered` are read in 8 places and **written in zero**. `markOrderPaid` → `paid`; `markOrderFailed` → `failed`; reaper → `expired`; `markOrderRefunded` → `refunded`; `payment_review` when inventory can't be reacquired. The `shipments` table has 3 SELECT-only readers and **no writer**. `lib/email/index.ts` even has a ready-made `shippingConfirmationHtml` that is never called. "Package sent" is not a feature that exists yet. | `lib/orders/service.ts` is the only file that mutates `orders.status`. |
| **P0-5** | **No admin order or inventory management.** Admin can moderate the forum, browse documents, read the audit log, browse Averia conversations and draft replies. There is no order list, no way to mark an order shipped, no tracking number field, no stock adjustment, no refund button. `adminLookupOrder` and `adminListLowStock` exist but are only reachable through the AI chat, not the admin UI. | `app/[locale]/admin/` has 6 pages; `app/api/admin/` has 6 routes; none touch `orders` or `vials`. |

### P1 — breaks trust or correctness

| # | Finding | Detail |
|---|---|---|
| **P1-1** | **Cart total ≠ checkout total.** The cart summary quotes shipping from `rates[0]` (Posti Express, €9.90) because `useCheckoutQuote` sends no `shippingMethodId` until the customer picks one on the shipping step. Cart showed **€49.90**; the payment step showed **€45.90** after the customer selected Standard. The first number the customer sees is wrong. | Live: cart `Total €49.90` → payment `Place order · €45.90`. |
| **P1-2** | **The 15-minute reservation TTL is hostile to crypto.** `RESERVATION_TTL_MINUTES = 15`. A crypto transfer routinely takes 10–60 minutes. A crypto order would have its stock hold released and the order set to `expired` before the money arrives. `markOrderPaid` does have a late-payment reacquire path that falls back to `payment_review`, so the money is not lost — but the order lands in manual review every time. | `lib/orders/service.ts:64`, `:176-183`, `:418-441`. |
| **P1-3** | **Checkout failures are a generic toast.** `POST /api/checkout` returns `503 payment_unavailable` when Stripe is unconfigured; the client shows `toast.error(r("checkoutFailed"))` and leaves the customer on the payment step with a `payment` object that was never set. No retry, no explanation, no alternative method. | Live: `/api/checkout` → 503 → "Checkout failed. Please try again." |
| **P1-4** | **Crypto is advertised but hard-disabled.** `checkoutSchema.paymentMethod` accepts `stripe` \| `coinbase`; `markOrderPaid` accepts `kind: "stripe" \| "coinbase"`; a full Coinbase Commerce webhook exists. But `app/api/checkout/route.ts:30-35` rejects anything but Stripe with `payment_unavailable`, **nothing ever calls the Coinbase Commerce API**, and `orders.cryptoChargeId` / `cryptoTxHash` / `invoiceUrl` / `paymentProviderFeeCents` / `exchangeRateEurPerUnit` are all dead columns. Note also that Coinbase's commerce product has been wound down — verify before depending on it. This plan removes the dependency on a hosted crypto gateway entirely. | `app/api/checkout/route.ts:29-35`, `app/api/webhooks/coinbase/route.ts`, `db/schema/index.ts` orders table. |
| **P1-5** | **Finland-only, and the customer is told late.** `addressSchema` hard-refines `country === "FI"`; the country field is `readOnly` and pre-filled. The EU/EEA is 27 countries and peptides are not shipped from FI to all of them without a legal review — but the store is single-country with no queue for expansion, and the copy says "Finland" everywhere. | `lib/checkout/schema.ts:8-19`, `components/checkout/CheckoutForm.tsx:250`. |
| **P1-6** | **No post-purchase surface.** The order confirmation page shows the order number, total, lines and batch codes, and nothing else: no saved order, no reorder, no re-download, no tracking, no "what happens next". `account/orders` shows a bare status list for signed-in users and "No orders yet" for guests, with no sign-in prompt. | `app/[locale]/checkout/confirm/[orderId]/page.tsx`, `app/[locale]/account/orders/page.tsx`. |
| **P1-7** | **Rate limiting is per-process without Upstash.** `lib/security/rate-limit.ts` falls back to an in-memory `Map` when `UPSTASH_REDIS_*` is unset, and the default `failMode: "memory"` fails *open* if Redis throws. On serverless that is no rate limit at all. The checkout limit is 30/h per IP, the quote limit 120/h per IP. | `lib/security/rate-limit.ts`. |
| **P1-8** | **Guest order access is a bearer token in the URL.** `orderAccessToken` is an HMAC over `guest-order:{orderId}` — fine, but the token travels in a query string, so it lands in logs, `Referer` headers and analytics. The `orderAccessToken` path is the only way a guest can see their order. | `lib/orders/access.ts`. |
| **P1-9** | **The AI assistant can add to cart but not check out.** 21 tools; `addToCart` returns a `proposedAction` that the client confirms. There is no `createOrder` tool and no server-side cart, so the assistant dead-ends at the cart. | `lib/ai/tools/cart.ts`, `lib/ai/tools/registry.ts`. |
| **P1-10** | **`lib/community/guard.ts:15` blocks Telegram handles** in community content (`/\b(telegram\|whatsapp\|signal\|wickr\|discord)\s*(@\|me\|handle)?\b/i`). If the bot or a support agent ever posts a Telegram link in the forum it is auto-flagged. Needs an exemption for the official bot handle. | `lib/community/guard.ts`. |

### What already works well — reuse it, do not rebuild it

- **Order creation is genuinely solid.** `createOrder` takes a `pg_advisory_xact_lock` on the checkout key, re-uses an existing order for the same idempotency key, and rejects a changed payload with `idempotency_conflict`. The quote is re-computed server-side and compared by SHA-256 hash (`expectedQuoteHash`) so the price the customer saw is the price charged.
- **Pricing is one authority.** `lib/pricing.ts` — 25.5% VAT included in gross prices, €150 free-shipping threshold, `computeShippingCents` applied in exactly one place (`quoteCart`).
- **Inventory reservations have a TTL and a reaper**, and the webhook handlers use the `webhook_events` ledger for idempotency.
- **The email outbox** (`enqueueEmail` → `deliverEmailOutbox`, leases, exponential backoff, dedupe keys) is exactly the shape the Telegram notifier needs.
- **i18n parity is enforced** (`pnpm check:i18n`, 1429 keys, all 5 locales in lockstep) and `research.crypto` ("Cryptocurrency") already exists, unused.
- **The quote API is fast and correct**: `POST /api/checkout/quote` returned a valid quote with lines, totals, hash and 2 shipping rates on every probe.

---

## 3. Target architecture — Telegram + crypto checkout

### 3.1 The flow

```
  browser                    site (Next.js)                    telegram              chain
     │                             │                                │                    │
  1. │ Pay with crypto ──────────►│                                │                    │
     │                             │ POST /api/checkout/crypto-session                   │
     │                             │  • re-quote server-side (quoteCart)                │
     │                             │  • create order  status=awaiting_crypto            │
     │                             │  • create crypto_checkout_session (token, amount)  │
     │◄────────────── 302 → https://t.me/<bot>?start=<token> ────────┤                    │
  2. │                             │                                │                    │
     │                             │◄── POST /api/telegram/webhook ──┤  /start <token>   │
     │                             │  (Telegram update)              │                    │
     │                             │  GET session (internal, HMAC)   │                    │
     │                             │  → send invoice message ────────┤ invoice + address │
     │                             │  → mirror to ops chat ──────────┤ ops notification   │
     │                             │                                │                    │
  3. │                             │                                │ buyer sends funds    │
     │                             │                                │───────────────────►│
     │                             │                                │                    │
     │                             │◄── GET /api/cron/crypto (poll) ─┘ watcher sees tx    │
     │                             │  • match deposit → session      │                    │
     │                             │  • markOrderPaid(…, "crypto")   │                    │
     │                             │  • enqueue receipt email        │                    │
     │                             │  → edit buyer message ✅ ───────┤ "payment received" │
     │                             │  → ops chat "💰 pack & ship" ───┤                    │
     │                             │                                │                    │
  4. │ ◄── confirmation page polls /api/orders/{id}/status ─────────┤                    │
     │                             │                                │                    │
  5. │                             │  admin: mark packed → shipped   │                    │
     │                             │  → tracking number + label     │                    │
     │                             │  → shipping email + telegram ───┤ "on its way"       │
```

### 3.2 Design decisions and why

**The bot never calculates a price.** The bot calls the site for the authoritative quote.
This is the single most important rule: the amount in the Telegram message must be
byte-identical to what the server will accept, otherwise every crypto order becomes a
manual reconciliation job. The bot is a *renderer*, the site is the *calculator*.

**The deep link carries an opaque token, not the cart.** Telegram `start` payloads are
capped at 64 characters and restricted to `A-Za-z0-9_-`. A cart cannot fit. So the payload
is a 22-char base62 id (`crypto_checkout_sessions.id`) that resolves server-side. Nothing
about the order leaks in the URL, and the token is single-use and expiring.

**The site creates the order *before* the Telegram hop.** The order, its lines, its batch
assignments and its inventory hold are committed server-side at session-creation time. The
bot is then a delivery channel for an already-authoritative order, not a place where
commerce happens. This means the Telegram bot can be replaced, taken down, or have its
token revoked without losing an order.

**The bot runs as a webhook endpoint inside the Next.js app, with a worker as an upgrade.**
The repo already runs Stripe, Coinbase and Sanity webhooks as Next routes, and already has
a cron route; this keeps one deployment. The bot logic lives in a framework-agnostic
`lib/telegram/` module so it can be lifted into a small standalone worker (grammY on
Fly.io/Railway, ~€5/mo) if webhook reliability or on-chain polling latency becomes a
problem — no logic rewrite, only a different entry point.

**Crypto amounts are matched on-chain, not by eye.** Two viable mechanisms:

| Approach | How matching works | Pros | Cons |
|---|---|---|---|
| **A. Unique address per order** *(recommended)* | Derive a fresh address from an HD xpub using the order index; match any tx paying that address. | Exact, no fee tolerance, no dust-attack surface, no ambiguity when two customers pay the same amount. | Needs HD key custody (xpub online, private key offline/HSM) and per-chain derivation. |
| **B. Shared address + unique amount** *(v1 fallback)* | One address; each order gets a unique decimal amount (`total + offset`); match by amount within a fee tolerance. | Simple, one wallet, no key management. | Fee tolerance is fuzzy; amounts can be pre-claimed by dust attacks; the customer must send an exact amount. |

Start with **B** if the team wants the feature live fast with one wallet, and design the
schema so switching to **A** is a per-session column change (`wallet_address` is already
per-session). Both need a **human "match by tx hash" override** in the admin queue, because
a shared-address deployment will eventually produce an ambiguous deposit.

**The EUR total is authoritative; the crypto amount is derived and rate-locked.** The
customer agrees to a EUR amount (the same number the card flow shows). The crypto amount
is computed once at session creation from a spot rate, and the rate + amount are locked for
the session TTL (30 min). When the session expires the customer re-quotes. The site stores
`exchangeRateEurPerUnit` and `paymentProviderFeeCents` — both columns already exist and
are unused — so accounting can reconcile EUR vs crypto later.

**Fees, confirmations and underpayment are explicit states.** Required confirmations per
chain (BTC 1–2, ETH 12+, TRC-20 19) gate when the order flips to `paid`. Underpayment goes
to `payment_review`, never to `paid`.

### 3.3 Data model

New tables (Drizzle, migrations under `db/migrations/`):

```ts
// A crypto checkout session = one bot invoice.
export const cryptoCheckoutSessions = pgTable("crypto_checkout_sessions", {
  id: text("id").primaryKey(),              // 22-char base62 → the t.me start payload
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  chain: text("chain").notNull(),            // btc | eth | usdt_trc20 | usdt_erc20
  amountCrypto: text("amount_crypto").notNull(),      // decimal string, exact
  amountEurCents: integer("amount_eur_cents").notNull(),
  rateEurPerUnit: doublePrecision("rate_eur_per_unit").notNull(),
  walletAddress: text("wallet_address").notNull(),
  derivationIndex: integer("derivation_index"),       // null for shared-address mode
  status: text("status").notNull().default("created"), // created|delivered|paid|expired|cancelled
  telegramUserId: text("telegram_user_id"),
  telegramChatId: text("telegram_chat_id"),
  botMessageId: text("bot_message_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("crypto_sessions_order_idx").on(t.orderId),
  index("crypto_sessions_status_idx").on(t.status),
])

// Every on-chain deposit the watcher sees, matched or not.
export const cryptoDeposits = pgTable("crypto_deposits", {
  id: text("id").primaryKey(),
  chain: text("chain").notNull(),
  txHash: text("tx_hash").notNull(),
  walletAddress: text("wallet_address").notNull(),
  amountCrypto: text("amount_crypto").notNull(),
  confirmations: integer("confirmations").notNull().default(0),
  seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  matchedSessionId: text("matched_session_id"),
  raw: jsonb("raw"),
}, (t) => [uniqueIndex("crypto_deposits_chain_tx_idx").on(t.chain, t.txHash)])

// Telegram delivery, mirroring email_outbox (dedupe key, lease, backoff).
export const telegramOutbox = pgTable("telegram_outbox", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  dedupeKey: text("dedupe_key").notNull().unique(),
  chatId: text("chat_id").notNull(),
  text: text("text").notNull(),
  parseMode: text("parse_mode").default("HTML"),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
```

Changes to existing tables:

| Table | Change |
|---|---|
| `orders` | New status `awaiting_crypto` (the column is free-text, so **no type change**); `paymentMethod` accepts `'crypto'`; reuse the dead columns `cryptoChargeId` (tx hash), `cryptoTxHash`, `exchangeRateEurPerUnit`, `paymentProviderFeeCents`. |
| `orders` | Reservation TTL becomes per-order: `RESERVATION_TTL_MINUTES` (15) for card, `CRYPTO_RESERVATION_TTL_HOURS` (default 6) for crypto. Currently hard-coded at `lib/orders/service.ts:181`. |
| `shipments` | Add `labelUrl`/`trackingNumber` writers — the columns exist, only the write path is missing. |

### 3.4 API surface

| Route | Method | Purpose |
|---|---|---|
| `/api/checkout/crypto-session` | POST | Public. Takes the same body as `/api/checkout` plus `chain`. Creates the order (`awaiting_crypto`), the session and the inventory hold, and returns `{ orderId, telegramUrl, expiresAt }`. Reuses the existing idempotency key + quote-hash machinery. |
| `/api/telegram/webhook` | POST | Telegram updates. Verifies `X-Telegram-Bot-Api-Secret-Token` (timing-safe), routes the update to a handler, always returns 200. |
| `/api/telegram/internal/session/[token]` | GET | Internal, HMAC-signed service auth. The bot reads the authoritative invoice payload: lines, unit prices, subtotal, shipping, VAT, total EUR, crypto amount, wallet address, BIP-21 URI, expiry, order number. |
| `/api/telegram/internal/notify` | POST | Internal. Ops bot posts an order summary + "pack and ship" reminder to the team chat. |
| `/api/telegram/internal/orders/[orderId]/ship` | POST | Internal, admin-authenticated. Marks packed/shipped, stores the tracking number, enqueues the shipping email + the Telegram "on its way" message. |
| `/api/cron/crypto` | GET | Cron (`Authorization: Bearer $CRON_SECRET`, same pattern as `/api/cron/maintenance`). Polls each configured chain, records deposits, matches them to sessions, flips orders to `paid`, sends buyer + ops notifications. |
| `/api/webhooks/telegram/crypto` | POST | *Optional* — if the team uses a hosted crypto processor instead of self-monitoring, the processor's signed webhook lands here and does the same matching. Keeps the processor swappable. |

### 3.5 Bot UX

**Buyer message** (on `/start <token>`), HTML, with an inline keyboard:

```
🧬 AverianLabs — order AL-20261023-A1B2C3

BPC-157 · 10 mg × 1        €69.00
BPC-157 · 5 mg  × 2        €79.80
------------------------------
Products                  €148.80
Shipping (Posti Standard)   €5.90
VAT included (25.5%)       €30.73
Total                     €154.70 EUR

Pay exactly:  0.00154210 BTC
(≈ €154.70 — rate locked for 29 min)

bc1q…9xk4                    ← tap to copy
bitcoin:bc1q…9xk4?amount=0.00154210&label=AverianLabs&message=AL-20261023-A1B2C3

Send only BTC on the Bitcoin network to this address.
Send any other asset or a different amount and the order will not clear.

[ 📷 Show QR ]  [ ✅ I have paid ]  [ 💬 Support ]
```

- The QR code is a locally-generated PNG of the BIP-21 URI (no third-party QR service — it would leak the order to a third party).
- **"I have paid"** calls the watcher immediately instead of waiting for the cron tick. This turns a 5-minute wait into a 3-second one and covers the "I just sent it" case.
- **Tapping the address** copies it (Telegram copies long strings on tap for monospace/code blocks).

**Commands**

| Command | Behaviour |
|---|---|
| `/start <token>` | Fetch the session, send the invoice, mark the session `delivered`. |
| `/start` | Welcome + "Open the store" deep link + list of active orders. |
| `/order` | Current order status: `awaiting_crypto` / `paid` / `shipped` / `expired`. |
| `/status` | Force a deposit check for the active order. |
| `/support` | Opens a support ticket (reuse the `support_tickets` table + `lib/ai/tools/create-support-ticket.ts` service). |
| `/help` | Short help. |

**Language**: the bot replies in the Telegram user's `language_code` mapped onto the site's locale set (`en, fi, de, sv, nl`). Order line names use the order's own locale. `research.crypto` already exists for the button label.

**Ops chat** (the team's private group chat): every session creates a message there so a human always has the order in front of them — order number, customer email, items, EUR total, crypto amount, address, expiry, and a direct link to the admin order page. On payment: "💰 **Paid** — AL-20261023-A1B2C3 · 0.00154210 BTC (€154.70) — pack and ship." On expiry: "⏰ **Expired** — AL-… — stock released."

### 3.6 Order lifecycle for crypto

```
createOrder(paymentMethod=crypto)        → status=awaiting_crypto, hold TTL 6h
   │
   ├─ session created, invoice sent      → session.status=delivered
   │
   ├─ deposit seen, confirmations < N     → session.status=delivered (pending confirmations)
   │
   ├─ confirmations ≥ N, amount ok       → markOrderPaid(orderId, txHash, "crypto")
   │                                         → status=paid, hold consumed, receipt email queued
   │                                         → buyer message edited to ✅, ops message sent
   │
   ├─ deposit underpaid                   → status=payment_review + support email
   │                                         → buyer told to send the difference
   │
   ├─ session expires, no deposit         → status=expired, hold released, stock restored
   │
   └─ buyer cancels in Telegram           → status=cancelled, hold released
```

`markOrderPaid` already does the hard parts (batch validation, inventory reacquisition,
receipt email with CoA links). It needs one change: the `kind` union becomes
`"stripe" | "coinbase" | "crypto"`, and the `order.paymentMethod !== kind` guard must line
up with `paymentMethod = "crypto"`.

### 3.7 Security

| Concern | Control |
|---|---|
| Webhook forgery | Telegram's `X-Telegram-Bot-Api-Secret-Token` header, compared with `crypto.timingSafeEqual`, matching the existing `lib/security/cron.ts` pattern. |
| Bot → site reads | HMAC service token (`lib/orders/access.ts` already implements the pattern) plus a dedicated `TELEGRAM_INTERNAL_SECRET`. Never expose the bot token to the client. |
| Bot token leak | `TELEGRAM_BOT_TOKEN` lives only in server env; the client never sees it. The checkout response contains only a `t.me` URL. |
| Order enumeration | The 22-char token is unguessable and single-use; the session endpoint returns 404 for unknown/expired tokens. |
| Rate limiting | The Telegram webhook is rate-limited per IP and per update id; the `webhook_events` table gives update-id idempotency so a Telegram retry never double-sends a message. |
| XSS in bot messages | All interpolated values (product names, customer email, notes) are HTML-escaped before insertion — the same `escapeHtml` used by `lib/email/index.ts`. Send `parse_mode=HTML` only when the payload is escaped. |
| Secrets in the client bundle | `NEXT_PUBLIC_*` is never used for Telegram. `lib/env.ts` gets `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_INTERNAL_SECRET`, `TELEGRAM_OPS_CHAT_ID`, `TELEGRAM_BOT_USERNAME`, `CRYPTO_WALLET_*`, `CRYPTO_RATE_API_URL` — all server-only, all optional so the build does not break when unset. |
| Replay | `webhook_events` insert with `onConflictDoNothing` before any side effect, exactly as `app/api/webhooks/stripe/route.ts` does. |
| Abuse | The existing `rateLimit` helper is used for session creation (e.g. 10/h per IP) — but note it degrades to per-process memory without Upstash, so **Upstash must be configured in production** or the limit is decorative. |

### 3.8 Compliance — flag before launch

Not legal advice; these need a human decision and are easy to miss.

1. **Crypto has no chargeback.** Card disputes are a fraud tool; crypto transfers are final. The bot message, the terms page and the checkout must state this plainly, and the operator should accept the risk or add a manual pre-approval step for high-value orders.
2. **Crypto payments in the EU are an AML surface.** Accepting crypto as consideration can pull the business into regulated territory depending on how it is converted and settled. Get advice before enabling it commercially.
3. **Price and currency disclosure.** The site's legal pages (`lib/legal.ts`, `app/[locale]/legal/*`) are built around EUR. The crypto price, the locked rate, the expiry and the network fee must all be disclosed before the customer pays, and the terms must cover what happens when the market moves between invoice and settlement.
4. **GDPR.** A Telegram `user_id` linked to an order is personal data. It needs a lawful basis, a stated retention period, and coverage in the privacy notice. Add a retention job that clears `telegram_user_id`/`telegram_chat_id` after the retention window.
5. **Age gate.** The site gates 18+. The bot is reachable without passing through the site's age gate — the bot must ask for confirmation and record it, or the terms must cover it.
6. **"Research use only" positioning.** Selling peptides as research chemicals and taking crypto payment for them is the combination that attracts the most regulatory attention. Make sure the funnel, the packaging and the paperwork all support the stated positioning, or change the positioning.
7. **Telegram's own rules.** The bot must not be used for unsolicited bulk messaging, and the ops chat must be a private group with the bot as admin.

---

## 4. Roadmap

Each phase is independently shippable and ends with something demonstrable.

**Delivery status: phases 1–7 are shipped. Phase 8 (EU expansion) is not started.**

### Phase 1 — Unbreak the store (P0-1, P1-1, P1-3) · *small, highest ROI* · **shipped**

1. Give `CheckoutSummary` a real CTA on the cart page:
   `components/cart/CartView.tsx` → `<CheckoutSummary locale={locale} ctaLabel={t("checkout")} ctaHref={`/${locale}/checkout/email`} />`,
   and make the CTA render even when the quote is still loading (disable it instead of hiding it) so the cart is never a dead end.
2. Make the cart quote follow the selected shipping method so the cart total equals the checkout total (`useCheckoutQuote` already sends `shippingMethodId`; the cart needs the checkout store's `shippingMethod` to be seeded with the default rate so both agree).
3. Add a `data-testid="cart-checkout-cta"` and a Playwright assertion that the cart page contains a link to `/checkout/email` — this is the regression test for the bug that is live today.
4. Surface `payment_unavailable` as a real message with a retry, not a generic toast.

### Phase 2 — Make the promo code honest (P0-2) · *small* · **shipped**

Either wire it to a real promotion engine (server-side discount, reflected in `quoteCart` and the quote hash) or **delete the input and the "Try AVARIA10" hint**. Do not ship a code that says "applied" and changes nothing. If it is rebuilt, `quoteCart` must apply the discount before the hash is computed, and the discount must appear as its own line in every summary.

### Phase 3 — Server-side cart + order lifecycle (P0-3, P0-4, P1-2) · *medium* · **partly shipped**

1. `checkout_carts` table (`id`, `userId`, `email`, `locale`, `items jsonb`, `updatedAt`) with a `POST /api/cart` API; the client Zustand store becomes a cache over it for signed-in users and falls back to `localStorage` for guests. **Not shipped** — the crypto checkout does not need it: the order is created on the server at handoff, so the bot reads a real order rather than a cart. A server-side cart is still worth having for signed-in customers and for the Phase 7 reorder flow.
2. Order status transitions `paid → packed → shipped → delivered`, with a guarded transition helper in `lib/orders/status.ts` and a `markOrderShipped(orderId, { carrier, service, trackingNumber, labelUrl })` that writes the `shipments` row, enqueues `shippingConfirmationHtml` (already written, never called) and notifies Telegram. **Shipped.**
3. Per-order reservation TTL (15 min card / configurable hours crypto). **Shipped** — 15 minutes for the card, 6 hours for crypto.

### Phase 4 — Admin order & inventory console (P0-5) · *medium* · **shipped**

`app/[locale]/admin/orders` + `app/api/admin/orders/*`: order list with filters (status, date, payment method), order detail with the buyer's items, batches and shipping, actions (mark packed, mark shipped + tracking, refund, release hold), and a low-stock list with inline stock adjustment. This is the surface the Telegram ops chat links into, and it is what makes "package sent" a button rather than a SQL statement.

### Phase 5 — Telegram bot (P1-4) · *medium* · **shipped**

The bot exists and can answer questions but cannot take money:
`lib/telegram/client.ts` (thin Bot API wrapper), `lib/telegram/handlers.ts` (pure, framework-agnostic), `lib/telegram/outbox.ts` (mirror of `email_outbox`), `app/api/telegram/webhook/route.ts`, `/start`, `/help`, `/order`, `/status`, and the ops chat mirror. Set the webhook with `setWebhook` including `secret_token`.

### Phase 6 — Telegram crypto checkout (P1-2, P1-4) · *large* · **shipped**

1. `crypto_checkout_sessions` + `crypto_deposits` + `telegram_outbox` tables and migrations.
2. `POST /api/checkout/crypto-session`; the payment step gains a "Cryptocurrency" option next to the card option, using the already-present `research.crypto` key.
3. Chain adapters (`lib/crypto/chains/*.ts`) behind a `ChainAdapter` interface: `rate()`, `expectedReceived()`, `requiredConfirmations()`, `scan()`.
4. The watcher in `/api/cron/crypto` and the matching logic.
5. The invoice message, QR code, BIP-21 URI, "I have paid" button, rate lock, expiry, underpayment → `payment_review`.
6. Buyer notification on payment (Telegram + the existing receipt email) and the ops "pack and ship" message.
7. The manual "match by tx hash" override in the admin console.

### Phase 7 — Post-purchase surface (P1-6, P1-9, P1-5) · *medium* · **shipped**

Order history with saved orders and one-click reorder (with an explicit price-change consent —
this is Phase L of the shop roadmap), a "what happens next" timeline on the confirmation page,
the AI assistant able to look up and re-order a past order, and the shipping/returns legal
page rewritten to match the actual delivery reality.

### Phase 8 — Expansion (P1-5, P1-7) · *large, later* · **not started**

Multi-country checkout (EU/EEA), OSS reverse-charge, EUR-per-line currency handling that the
schema already anticipates (`currencyPerLine`), Sendcloud label generation, and rate limiting
that actually holds (Upstash configured, `failMode: "closed"` on the money paths).

---

## 5. File map

**New — Phase 1–2**
| Path | Change |
| --- | --- |
| `components/cart/CartView.tsx` | pass `ctaHref`/`ctaLabel` to `CheckoutSummary`; keep the CTA visible while quoting |
| `components/checkout/CheckoutSummary.tsx` | render the CTA whenever `ctaHref` is set; disable (not hide) while the quote loads |
| `lib/checkout/use-quote.ts` | seed the default shipping method so the cart and the checkout agree |
| `components/checkout/CheckoutForm.tsx` | distinguish `payment_unavailable` from a generic failure; offer a retry |
| `components/cart/PromoCodeInput.tsx` | wire to `/api/promo` or remove |
| `messages/{en,fi,de,sv,nl}.json` | new `cart.*` / `checkout.*` keys for the CTA and payment errors |

**New — Phase 3–4**
| Path | Change |
| --- | --- |
| `db/schema/index.ts` | `checkout_carts`, `shipments` writers, `orders` status comment |
| `lib/orders/service.ts` | guarded transition helper; `markOrderShipped`; per-order reservation TTL |
| `lib/orders/status.ts` | the single source of truth for legal status transitions |
| `app/[locale]/admin/orders/page.tsx`, `app/api/admin/orders/**` | order console |
| `lib/email/index.ts` | call `shippingConfirmationHtml` |

**New — Phase 5–6**
| Path | Change |
| --- | --- |
| `lib/telegram/client.ts` | Bot API wrapper (`sendMessage`, `editMessageText`, `sendPhoto`, `setWebhook`) |
| `lib/telegram/handlers.ts` | framework-agnostic update handlers |
| `lib/telegram/outbox.ts` | delivery queue mirroring `lib/email/outbox.ts` |
| `lib/telegram/messages.ts` | localised message templates |
| `lib/crypto/chains/{btc,eth,tron}.ts` | `ChainAdapter` implementations |
| `lib/crypto/rates.ts` | spot-rate lookup + lock |
| `lib/crypto/matching.ts` | deposit → session matching, fee tolerance |
| `app/api/telegram/webhook/route.ts` | Telegram updates |
| `app/api/telegram/internal/**` | bot → site service API |
| `app/api/checkout/crypto-session/route.ts` | session creation |
| `app/api/cron/crypto/route.ts` | chain watcher |
| `db/schema/index.ts` | `crypto_checkout_sessions`, `crypto_deposits`, `telegram_outbox` |
| `lib/env.ts` | `TELEGRAM_*`, `CRYPTO_*` (all optional) |
| `.env.example` | document the new variables |

---

## 6. Validation

Every phase ends with a check that can be re-run:

| Check | Command / method |
| --- | --- |
| Types | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Unit tests | `pnpm test` |
| i18n parity | `pnpm check:i18n` (all 5 locales, 1429 keys) |
| i18n usage | `pnpm check:i18n:usage` |
| Env contract | `pnpm env:check` |
| Legal placeholders | `pnpm legal:check` |
| E2E | `pnpm test:e2e` — add `tests/checkout.spec.ts` cases: cart page contains a `/checkout/email` link; the cart total equals the payment-step total; `POST /api/checkout/crypto-session` returns a `t.me` URL; a session token resolves to the right order; a simulated deposit flips the order to `paid` and the buyer message to "✅". |
| Integration | `pnpm test:integration` — add a case that a crypto order holds stock for the crypto TTL and a card order for 15 minutes. |
| Manual | The scripted walkthrough used in this audit (shop → PDP → add → cart → checkout → payment → confirmation), re-run against a seeded `build` database. |

---

## 7. Open questions for the team

1. **Crypto rail.** Which chain(s)? BTC, ETH, USDT-TRC-20, USDT-ERC-20? This determines the wallet, the watcher and the fee model. Recommendation: start with **USDT-TRC-20** (low fees, wide support in the peptide community) plus **BTC**.
2. **Wallet custody.** Who holds the keys, and can they generate an HD xpub (unique address per order)? If not, the shared-address + unique-amount fallback applies and the manual-match override becomes mandatory.
3. **Bot vs human Telegram account.** The brief allows either. A **bot** is required for the automatic cart/total/invoice behaviour — a human account cannot be driven by the site. Recommended: bot for the customer flow, human-managed Telegram group as the ops channel (the bot posts into it).
4. **Rate-lock window.** 30 minutes? 2 hours? Longer locks reduce re-quote friction but increase the merchant's exposure to price movement.
5. **Crypto order minimum.** Below a threshold, is crypto even offered? A small minimum (e.g. €50) keeps the manual-match rate down and the fee economics sane.
6. **Shipment labels.** Does the team want Sendcloud label generation in Phase 6/7, or manual label creation for now? `SENDCLOUD_*` keys are already in the env schema and only the rates path uses them today.
7. **Countries.** Finland-only for now, or EU/EEA at launch? This changes the legal pages, the VAT handling and the shipping rate set.
8. **Does the "research use only" positioning survive a crypto checkout?** Worth a decision before Phase 6, not after.
