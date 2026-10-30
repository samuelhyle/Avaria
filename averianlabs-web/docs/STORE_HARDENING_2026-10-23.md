# Store hardening + Telegram crypto checkout — delivery

Date: 23 October 2026 · Status: **phases 1–6 delivered** · Scope: storefront checkout, order fulfilment, promotions, admin, Telegram crypto checkout

Plan: `docs/STORE_AND_TELEGRAM_CRYPTO_PLAN_2026-10-23.md` · Next: `docs/DEVELOPMENT_ROADMAP_2026-10-23.md` · Operations: §10 of this file, and `docs/RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md`

---

## 1. What was broken, and what it is now

The store could not complete a purchase. A customer could fill a cart and then hit a
wall: the cart page rendered no control that led to the checkout, so there was no way
to pay. The promo code field said "applied" and changed nothing. Orders could never be
dispatched, because `shipped` and `delivered` were states that no code path could
reach, and there was no admin surface for orders at all.

| Finding | Before | After |
| --- | --- | --- |
| Cart → checkout | No link existed anywhere in the site | `data-testid="checkout-cta"` on the cart page, pointing at `/checkout/email` |
| Cart total vs checkout total | Cart quoted Express by default, checkout quoted the customer's choice — the total silently changed between the two screens | The server's chosen rate is persisted, so both screens price the same delivery and name it ("Posti · Express") |
| Promo codes | `AVARIA10` showed "applied" and discounted nothing | Real server-side promotions, priced inside `quoteCart` and covered by the quote hash |
| `shipped` / `delivered` | Read in 8 places, written in 0 | A guarded transition table; `paid → packed → shipped → delivered` works and writes the `shipments` row |
| Order operations | No admin surface for orders at all | `/admin/orders` with fulfilment actions, and `PATCH /api/admin/orders/{id}` |
| Crypto checkout | Schema columns existed, nothing used them | The order is created server-side, the invoice is issued by the Telegram bot, the deposit is matched on-chain, and the buyer and the team are both notified |

## 2. What was built

### 2.1 Checkout

- `components/checkout/CheckoutSummary.tsx` — the CTA renders whenever `ctaHref` is
  set, whether or not the quote has loaded. The quote is a display convenience; the
  checkout re-prices server-side, so a failed quote must never hide the way forward.
- `lib/checkout/use-quote.ts` — persists the server's default shipping rate into the
  checkout store, so the cart summary and the checkout step agree.
- `components/checkout/CheckoutForm.tsx` — a payment-method choice (card /
  cryptocurrency), an inline failure panel with a retry, and a specific message per
  server code (`payment_unavailable`, `out_of_stock`, `not_saleable`,
  `quote_changed`, `attempt_expired`, `rate_limited`) instead of one generic toast.

### 2.2 Promotions

- `lib/promotions/service.ts` — the code is resolved on the server, the discount is
  priced from the lines, and the redemption counter is incremented with a conditional
  update so two concurrent orders cannot both take the last use.
- `lib/orders/quote.ts` — the discount is applied inside the quote and is part of the
  quote hash, so a quote priced without a code cannot be spent with one, and a client
  that tampers with an amount is ignored.
- `promotions` / `promotion_redemptions` tables, `pnpm db:seed-promotions`, and the
  `RESEARCH10`, `WELCOME15` and `FREESHIP` codes.

### 2.3 Order lifecycle

- `lib/orders/status.ts` — the transition table, and the only place that defines which
  moves are legal.
- `lib/orders/service.ts` — `transitionOrder`, `markOrderPacked`, `markOrderShipped`
  (writes the `shipments` row and sends the shipping email), `markOrderDelivered`.
  Every status write in the codebase now goes through the guarded helper.
- A late payment still re-opens a failed or expired order, so money is never silently
  dropped.

### 2.4 Admin

- `/admin/orders` and `/admin/orders/[orderId]` — the order list with status filters
  and the order detail with the items, the discount, the shipping address, the
  shipments and the fulfilment actions.
- `PATCH /api/admin/orders/{id}` — `pack`, `ship`, `deliver`, `refund`. Each action is
  checked against the transition table and written to the audit log.

### 2.5 Telegram bot

- `lib/telegram/client.ts` — the Bot API wrapper. The token never leaves the server.
- `lib/telegram/handlers.ts` — framework-agnostic update handlers: `/start <token>`
  issues the invoice, `/status` and `/order` report progress, `/help`, and the inline
  buttons.
- `lib/telegram/messages.ts` — localised copy in all five site locales, with every
  interpolated value HTML-escaped for Telegram's parse mode.
- `lib/telegram/outbox.ts` — the delivery queue, mirroring `email_outbox`: a dedupe key
  makes every message exactly-once, a lease stops two workers claiming a row, and a
  failed send backs off.
- `app/api/telegram/webhook/route.ts` — the update endpoint. The
  `X-Telegram-Bot-Api-Secret-Token` header is compared in constant time, and the update
  id is recorded in the same `webhook_events` ledger the payment webhooks use, so a
  Telegram retry never sends a message twice.

### 2.6 Crypto checkout

- `lib/crypto/chains.ts` — one adapter per asset (BTC, ETH, USDT-TRC-20, USDT-ERC-20)
  behind a `ChainAdapter` interface. Amounts are handled as integer units; there is no
  floating point in the money path.
- `lib/crypto/rates.ts` — the EUR price, with a public API and a configured fallback.
  The rate is locked when the invoice is issued.
- `lib/crypto/session.ts` — the invoice. The token is 22 base62 characters (~130 bits)
  and is the only thing in the deep link; the cart never travels in the URL.
- `lib/crypto/matching.ts` — every deposit the watcher sees is stored, matched or not.
  Unmatched deposits are what makes a manual "match by transaction hash" override
  possible.
- `lib/crypto/watcher.ts` — polls each chain, matches the deposits, marks the orders
  paid through the same `markOrderPaid` path the card payments use, and queues the
  notifications.
- `app/api/checkout/crypto-session/route.ts` — creates the order (`awaiting_crypto`)
  and the invoice, and returns a `t.me` deep link. The client receives nothing else.
- `app/api/cron/crypto/route.ts` — the watcher, behind the same `CRON_SECRET` bearer
  check as the other cron routes.

### 2.7 The end-to-end flow

```
  browser                 site                     telegram              chain
     │                      │                          │                   │
  1. │ Pay with crypto ────►│                          │                   │
     │                      │ POST /api/checkout/       │                   │
     │                      │   crypto-session         │                   │
     │                      │  • order (awaiting_crypto)│                   │
     │                      │  • inventory hold (6 h)  │                   │
     │                      │  • session + locked rate │                   │
     │◄── 302 t.me/bot?start=token ─────────────────────┤                   │
  2. │                      │◄── /start token ─────────┤                   │
     │                      │  GET session (internal)  │                   │
     │                      │  → invoice message ──────►│ itemised order,  │
     │                      │  → ops chat message ─────►│ total, address,  │
     │                      │                          │ amount, deadline  │
  3. │                      │                          │──── transfer ────►│
     │                      │◄── GET /api/cron/crypto ─┤                   │
     │                      │  • match deposit          │                   │
     │                      │  • markOrderPaid          │                   │
     │                      │  • receipt email queued   │                   │
     │                      │  → buyer message edited ─►│ "payment received"│
     │                      │  → ops message ──────────►│ "pack and ship"   │
  4. │ ◄── /api/orders/{id}/status (poll) ───────────────┤                   │
  5. │                      │ admin: pack → ship → delivered                    │
     │                      │  → tracking + shipping email                     │
```

## 3. Database

| Migration | Change |
| --- | --- |
| `0006_promotions.sql` | `promotions`, `promotion_redemptions`; `orders.discount_cents`, `orders.promo_code` |
| `0007_telegram_crypto.sql` | `telegram_outbox`, `crypto_checkout_sessions`, `crypto_deposits` |

Both are hand-written, matching the convention of `0001`–`0005`.

## 4. File map

**New — core**
| Path | Purpose |
| --- | --- |
| `lib/promotions/service.ts` | Resolve, price and redeem a promotion |
| `lib/orders/status.ts` | The order status machine |
| `lib/admin/orders.ts` | Admin order queries |
| `lib/telegram/{client,handlers,messages,outbox}.ts` | The Telegram bot |
| `lib/crypto/{chains,rates,session,matching,watcher}.ts` | The crypto checkout |
| `app/api/telegram/webhook/route.ts` | Telegram updates |
| `app/api/checkout/crypto-session/route.ts` | Issue a crypto invoice |
| `app/api/cron/crypto/route.ts` | The chain watcher |
| `app/api/crypto/chains/route.ts` | The chains the store accepts |
| `app/api/admin/orders/**` | The admin order API |
| `app/[locale]/admin/orders/**` | The admin order console |
| `components/checkout/CryptoPaymentOption.tsx` | The crypto payment control |
| `components/admin/order-actions.tsx` | The fulfilment controls |
| `scripts/seed-promotions.ts` | Seed the promotion codes |
| `scripts/setup-telegram-webhook.ts` | Register the webhook with Telegram |

**Modified**
| Path | Change |
| --- | --- |
| `lib/orders/quote.ts` | Apply the promotion inside the quote and the hash |
| `lib/orders/service.ts` | Guarded transitions, fulfilment, crypto order status, per-order hold TTL |
| `lib/checkout/{schema,store,use-quote}.ts` | The promotion code travels with the quote and the checkout |
| `components/checkout/{CheckoutSummary,CheckoutForm}.tsx` | The CTA, the method choice, the error panel, the discount line |
| `components/cart/{CartView,PromoCodeInput,CartMiniSummary}.tsx` | The real promo input, one shared quote, a labelled subtotal |
| `app/api/checkout/route.ts` | Return the discount and the promotion code |
| `app/api/cron/maintenance/route.ts` | Drain the Telegram outbox |
| `db/schema/index.ts` | The new tables and columns |
| `lib/env.ts`, `.env.example` | The `TELEGRAM_*` and `CRYPTO_*` variables |
| `messages/{en,fi,de,sv,nl}.json` | 59 new keys, parity enforced |

## 5. Review pass — the bugs found in the first delivery

The first delivery was reviewed against the code rather than against the plan, and
it contained four serious defects. All are fixed, and each has a test that fails if
the fix is reverted.

### The critical one: deposits were matched before the chain confirmed them

`matchDepositToSession` never looked at the confirmation count. A transaction
sitting in the mempool — which can still be dropped or replaced — would have
fulfilled the order immediately. Two more faults compounded it:

- A deposit was only examined on the scan where it first appeared. Once it was
  recorded, a later scan skipped it, so it could never be matched once its
  confirmations grew.
- The Bitcoin and TRON adapters reported a confirmation count of `1` or `0` rather
  than the real depth, because the block explorer endpoint only says whether a
  transaction was mined.

Fixed by requiring `CHAINS[chain].requiredConfirmations` before a match, by
refreshing the confirmation count on every scan instead of only on first sight, and
by computing confirmations from the chain tip (`confirmationsSince`).

### The tolerance that was wide enough to excuse a quarter of an order

The Bitcoin fee tolerance was 20 000 satoshis. On a €50 order that is a quarter of
the invoice — the matcher would have accepted a 24 % underpayment as a fee. The
tolerance is now 5 000 satoshis **and** capped at 5 % of the order, so a fee that
is a rounding error on a large order cannot excuse a large share of a small one.
A shortfall beyond either limit goes to `payment_review`.

### Three smaller ones

| Defect | Fix |
| --- | --- |
| The confirmation page never updated for a crypto order: `OrderStatus` only polled while the status was `pending`, and a crypto order waits in `awaiting_crypto` | It polls for both |
| The cart was never emptied after a crypto payment: the crypto route never registered the order with the checkout store | `CryptoPaymentOption` stores the order id and the confirmation url |
| The "I have paid" button checked nothing — it re-sent the invoice | It runs `checkSessionPayment` against the chain, with a 5-second budget, and answers with one of four outcomes |
| A failed Telegram edit lost the buyer's payment confirmation | The outbox falls back to sending a new message |
| Crypto invoices only expired if the chain watcher cron was running | `expireStaleSessions` also runs from the maintenance cron |

Two further defects were found while building the remaining work:

- The admin shell rendered a second `<main>` inside the layout's `<main>`. Nested
  `<main>` elements are invalid HTML and give assistive technology two competing
  content landmarks.
- The fulfilment panel's heading read "Mark as packed" whatever the order's state.

### A test that was corrupting the shared database

The promotions suite created an order and deleted the redemption row but not the
order. The pending order survived, and the reservation reaper — which the
reliability suite calls with a future clock — expired it and put the stock back.
The visible symptom was the inventory drifting upwards by one per run, and the
reliability suite's "exactly one reservation expired" assertion failing depending
on the order the files happened to run in.

Fixed, and the integration suite now leaves the database exactly as it found it:
three consecutive runs give identical results, the fixture stock stays at 20 and
no order survives.

### The remaining plan items, now done

- **Admin inventory console.** `/admin/inventory` lists every sellable SKU with
  its stock, thinnest first. Stock is set by absolute count, not by a delta, and
  the low-stock alert level is set next to it — without a threshold there was
  nothing for the panel to flag.
- **Manual deposit matching.** `POST /api/admin/crypto/deposits` attaches a
  confirmed deposit to an invoice by transaction hash. It settles the order
  through the same path the automatic matcher uses, so the buyer and the team are
  told either way.
- **The crypto receipt.** The receipt email carries the amount that was sent and
  the transaction that paid for it. A crypto payment has no card statement to
  fall back on.
- **Post-purchase surface.** The confirmation page shows what happens next, the
  crypto amount and the transaction. The account order list shows the items and
  offers "Buy again", with an explicit confirmation when the price has changed —
  reordering silently at a different price would be a surprise at checkout.

## 6. Visual and content review pass

The storefront was reviewed page by page against the running site, at desktop and
mobile widths. Six things were wrong, and four of them were shipping defects rather
than taste.

### The English catalogue was showing Finnish

Three strings had been copied from `fi.json` into every locale at once, so the English
shop page read **"Pikasuodattimet"** above the quick filters and **"Asiakirjat"** in
place of "Documents". The key-parity check could not see it: every locale had the key,
and every locale had the same Finnish value.

Fixed, and `scripts/check-i18n-locale-leaks.mjs` now guards it. The guard also catches
the other shape that bit twice during this work — a leaf that holds an object where a
string was meant (`j.research.checkoutTrust = { checkoutTrust: "…" }`), which renders
as the raw key at runtime. `pnpm check:i18n` runs both checks.

### The catalogue hid what could be bought

A flat list of seventeen materials where fifteen read "Currently unavailable" buried
the two that could actually be ordered. The catalogue now leads with **"Available now"**
and keeps the rest under **"Currently unavailable"**, with a line explaining that a
quote can be requested. Nothing is hidden — the honest-scope positioning does not
change — but the buyable path is no longer the second row of a wall of grey.

Inside the unavailable section the availability badge is no longer repeated on every
row: the heading already says it. A quote-only material still keeps its badge, because
that says something different — the next step is a quote, not an order.

### The trust strip made a claim the site cannot support

The product page promised **"Stripe + EU servers"**. Stripe processes card data in the
United States, so the claim as written was not true, and it was hardcoded English in a
page that is otherwise fully translated. The three trust points are now translated and
say what is actually true: *"Secure checkout — Card details go straight to the payment
provider"*, *"Batch-traceable — The original certificate is on file"*, *"Free over €150 —
Delivery within Finland"*.

### The cart page contradicted the checkout

- The eyebrow read **"Cart · 1 of 4"** while the stepper underneath started at "Email".
  The cart is not one of the four steps, so it now reads **"Review your order"**.
- The reassurance panel promised *"Card details are entered into the payment provider's
  form"* — on a page with no payment form. It now describes the checkout as a whole:
  pay by card or with cryptocurrency, confirmed by email, with the batch documents.

### The product page repeated itself

The VAT note appeared twice (under the price and beside the quantity) and the batch ID
appeared twice (in the price box and in the batch card). Each now appears once. The
"Save for later" wishlist button sat next to a "Sign in to add to a plan" link, and the
two labels read like the same action; they are now distinguishable.

The cart drawer also listed every item twice — once in the line-item list and again in
the mini-summary below it. The mini-summary only repeats the items in the header
popover, where there is no other list.

### A truncated button and a spelling drift

The shop search button used the long placeholder string and rendered as "Search
products…" clipped to "Search products...". It now says "Search". The empty cart's
"Browse the catalog" was the only American spelling in an otherwise British-English
catalogue ("catalogue", "organisation", "labelled"); it is now "Browse the catalogue".

## 7. What the development roadmap changed

The roadmap in `docs/DEVELOPMENT_ROADMAP_2026-10-23.md` was executed after this
delivery. Two of its findings were defects in the code above:

- **The vial sizes rendered in whatever order the database returned them.** The
  catalogue query has no `ORDER BY`, so the product card read "10 mg / 5 mg" and the
  product page could preselect the wrong variant. The catalogue now sorts by unit and
  size, and the test that caught it passes.
- **A referral redemption blocked its order from being deleted.** The foreign key had
  no `ON DELETE` clause. It is now `SET NULL`, because a referral attribution must not
  stand in the way of removing an order.

The roadmap also closed three promises the site was making and not keeping:

- The **"Refund" button did not refund.** It flipped a database status and the customer
  kept their money. It now moves the money through the provider — or records the
  outbound crypto transaction hash, or a manual reason — restores the stock and emails
  the customer.
- **The referral programme promised a discount and a credit that never happened.** The
  discount is now a promotion that reaches the quote; the credit is settled when the
  order is paid.
- **The newsletter had no way to leave.** There was no unsubscribe route, the column
  for it was never written, and the confirmation email told subscribers to contact
  support. There is now a self-service unsubscribe, linked from every confirmation
  email.

And two operational findings that would have shipped as silent failures:

- **Nothing scheduled the maintenance cron on Netlify.** The Telegram outbox is
  drained only by the cron routes, so the bot would never have sent an invoice or a
  payment confirmation. There are now scheduled functions for both.
- **The coverage thresholds had never applied**, because the coverage provider was
  never installed. It is installed now and the thresholds run in CI.

## 8. Running it locally for testing

```bash
./scripts/deploy-local-test.sh          # build + run the production server on :3000
./scripts/deploy-local-test.sh --dev    # the same, with hot reload
./scripts/deploy-local-test.sh --reset # drop the test database and re-create it
./scripts/deploy-local-test.sh --stop  # stop the server
```

The ordinary seed writes the reference products as **drafts with no prices and no
batches**, because the supplier evidence for them does not exist. That is right for a
database that might hold real orders, and it means nothing can be bought. The test
seed (`pnpm db:seed-local-demo`) promotes the same catalogue into a locally orderable
state — active products, prices, stock, a released batch per variant and a public
certificate per batch — and marks everything `local-demo-fixture` so it can never be
mistaken for supplier evidence.

### Three defects the local deployment exposed

They were invisible in production and only appeared on a plain-HTTP local server.

- **The admin navigation had no locale prefix.** The links pointed at `/admin/orders`
  rather than `/en/admin/orders`, so every click went through the middleware redirect,
  and the client-side RSC prefetch for the link was upgraded to HTTPS by the
  Content-Security-Policy — which a plain-HTTP server cannot answer. Every navigation
  failed with `ERR_SSL_PROTOCOL_ERROR` and the console appeared to crash. The links
  are now locale-prefixed, which also fixed the active state, which never highlighted
  because the comparison was against the bare path.
- **`upgrade-insecure-requests` was sent on a plain-HTTP server.** The directive
  upgrades the browser's own subresource requests to `https://`. It is now derived
  from `AUTH_URL`, the canonical origin the application is configured with, so it is
  sent in production and omitted locally.
- **The notification bell asked for notifications on every page view**, and a visitor
  got a 401 logged on every page. The bell is now only rendered for a signed-in
  customer, and the endpoint answers a visitor with an empty list rather than a 401.

`tests/admin-console.spec.ts` asserts the combination, because neither change alone
reproduces the failure.

### The integration suite needs its own database

The integration tests refuse to run against the development database: they
require `DATABASE_URL` and `TEST_DATABASE_URL` to be **different**, and the
database name to be one of `averian_reliability` or `build`. Pointing both at
`build` makes every suite abort with `isolated database required` — which looks
like a broken change but is only a missing test database.

```bash
docker exec averianlabs-postgres psql -U averianlabs -d postgres \
  -c "CREATE DATABASE averian_reliability;"

DATABASE_URL="postgres://averianlabs:averianlabs@localhost:5434/averian_reliability" \
  pnpm drizzle-kit migrate

set -a && source .env.local && set +a
export DATABASE_URL="postgres://averianlabs:averianlabs@localhost:5434/averian_reliability"
export TEST_DATABASE_URL="$DATABASE_URL"
pnpm db:seed && pnpm tsx scripts/seed-test-commerce.ts
pnpm test:integration
```

`AUTH_SECRET` has to be present as well — it is read straight from
`process.env`, so `.env.local` has to be sourced into the shell rather than
merely existing on disk.

## 9. Verification

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Pass |
| `pnpm lint` | **0 errors**, 42 warnings, all pre-existing style warnings |
| `pnpm test` | 423 passed, 4 skipped |
| `pnpm test:integration` | 67 passed, 2 skipped-by-credential. The 2 failures in `reliability.test.ts` need `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` and fail the same way on the untouched tree. The suite needs an isolated database — see section 8 |
| `pnpm test:e2e` | **152 passed, 0 failed, 3 skipped.** The suite went from 15 failures to none: twelve were the missing `TEST_DATABASE_URL` and three were the register rate limit firing mid-suite. `tests/checkout-crypto.spec.ts` is new and covers the crypto payment option |
| Local deployment | 27/27 checks in a browser against the running server: the catalogue, the product page, add to cart, the four checkout steps, the crypto option, a real promotion discount, the admin order and inventory consoles, and every public route with no console errors |
| Manual | The admin console, the inventory panel, the manual deposit match, the reorder flow and the price-change consent, all driven with a signed-in administrator |
| i18n | `pnpm check:i18n` now runs the key-parity check **and** the locale-leak guard, so Finnish copy in another locale fails the build |
| Manual | The full crypto flow driven with Playwright against the production build: cart → checkout → cryptocurrency → the browser lands on `https://t.me/<bot>?start=<22-char token>`, and the order is stored as `awaiting_crypto` with the invoice amount derived from the euro total at the locked rate |

New integration suites:

| Suite | Covers |
| --- | --- |
| `tests/integration/promotions.test.ts` | The discount, the quote hash, the redemption, and that no client input can change the price |
| `tests/integration/order-lifecycle.test.ts` | `paid → packed → shipped → delivered`, and that illegal moves are refused |
| `tests/integration/telegram-crypto.test.ts` | The invoice, the ops chat, the locale, the escaping, the deposit matching, and the crypto receipt |
| `tests/integration/crypto-deposits.test.ts` | The confirmation rule, the re-examination of a known deposit, the confirmation arithmetic, and the shortfall cap |
| `tests/unit/locale-leak-guard.test.ts` | The guard itself: Finnish words in a non-Finnish locale, Swedish and German left alone, and the object-where-a-string-was-meant shape |
| `tests/shop.spec.ts` | The catalogue leads with what is available, the unavailable section does not repeat the badge on every row, and the English catalogue shows no Finnish copy |

## 10. Operations

### Enabling the crypto checkout

The full walkthrough — BotFather, the ops chat, the webhook, the schedule, the
verification and the troubleshooting table — is in
**`docs/TELEGRAM_BOT_SETUP_2026-10-26.md`**. The short version:

```bash
# 1. Environment (see .env.example)
TELEGRAM_BOT_TOKEN="…"
TELEGRAM_BOT_USERNAME="AverianLabsBot"     # no @
TELEGRAM_WEBHOOK_SECRET="…"                # 16–256 chars, A-Za-z0-9_- only
TELEGRAM_INTERNAL_SECRET="…"               # ≥ 16 chars
TELEGRAM_OPS_CHAT_ID="-100…                # the team's chat
CRYPTO_ENABLED_CHAINS="btc,usdt_trc20"
CRYPTO_WALLET_ADDRESSES="btc=bc1…,usdt_trc20=T…"
CRYPTO_RATE_API_URL="https://api.coingecko.com/api/v3/simple/price"
CRYPTO_FALLBACK_RATES="btc=60000,usdt_trc20=0.92"   # used when the API is down
ETHERSCAN_API_KEY="…"                      # for eth and usdt_erc20
TRONGRID_API_KEY="…"                        # for usdt_trc20

# 2. Register the webhook (once per deployment)
pnpm telegram:setup-webhook https://averianlabs.eu

# 3. Schedule the watcher — every minute or two
*/2 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://averianlabs.eu/api/cron/crypto
```

`TELEGRAM_WEBHOOK_SECRET` must be generated with `openssl rand -hex 32`, not
`openssl rand -base64`: Telegram only accepts `A-Z a-z 0-9 _ -` in the secret
and refuses the whole `setWebhook` call otherwise. The site validates the
character set at startup, so a bad value fails the deploy instead of silently
breaking the webhook.

The webhook URL has to be HTTPS on port 443, 80, 88 or 8443 — Telegram does not
deliver to any other port, and not to `http://` at all. A local server needs a
tunnel.

With none of these set the crypto option is not offered at all: `/api/crypto/chains`
reports `available: false` and the checkout omits cryptocurrency from the
payment method list, rather than offering a method that cannot work.

### The admin console

| Route | What it is for |
| --- | --- |
| `/admin/orders` | Every order, with status filters |
| `/admin/orders/{id}` | The items, the discount, the address, the crypto invoice, and the fulfilment actions |
| `/admin/inventory` | Every sellable SKU with its stock and its alert level |
| `PATCH /api/admin/orders/{id}` | `pack`, `ship`, `deliver`, `refund` |
| `PATCH /api/admin/vials/{id}` | Set the stock and the alert level |
| `GET/POST /api/admin/crypto/deposits` | The deposits that belong to no order, and the manual override that attaches one |

### Everyday flow

1. The customer pays with cryptocurrency and the bot sends them the amount and the
   address.
2. The watcher sees the deposit, matches it to the invoice, marks the order paid and
   queues the receipt email.
3. The bot edits the customer's message to "Payment received" and posts
   "💰 Paid — AL-… — pack and ship" in the ops chat.
4. An operator opens `/admin/orders/<id>`, marks the order packed, then shipped with
   the carrier and the tracking number. The customer gets the shipping email and the
   order shows as shipped.

### When something goes wrong

| Symptom | What to check |
| --- | --- |
| The bot does not answer | `TELEGRAM_BOT_TOKEN`; the webhook registration (`pnpm telegram:setup-webhook`); `/api/telegram/webhook` returning 503 means the token is unset |
| The customer says they paid but the order is still `awaiting_crypto` | `GET /api/cron/crypto` — the report names the chain and the error. A configured chain that is missing its explorer key reports `explorer_not_configured` |
| A deposit arrived but nothing matched | The deposit is in `crypto_deposits` with `matched_session_id` null. Match it by hand: `assignDepositToSession(chain, txHash, sessionId)` in `lib/crypto/matching.ts` |
| The customer underpaid | The order goes to `payment_review` and the money is never silently dropped. The deposit is below the chain's fee tolerance |
| The order expired | The session window closed and the hold was released. The stock is back |

### Decisions still open

1. **Wallet custody.** The current design uses a shared receiving address with a
   unique amount per order and a fee tolerance. Unique addresses per order (HD
   derivation from an xpub) are the more robust design and only need the `wallet_address`
   column to change — but they need key management the business does not have yet.
2. **Chain choice.** USDT-TRC-20 has the lowest fees; Bitcoin is the most expected.
   Both are supported.
3. **Price floor.** A minimum order value would keep the fee economics sane and the
   manual-match rate down.
4. **Legal review.** Crypto has no chargeback, an EU crypto payment is an AML question,
   and the Telegram user id is personal data. See §3.7 of the plan.
