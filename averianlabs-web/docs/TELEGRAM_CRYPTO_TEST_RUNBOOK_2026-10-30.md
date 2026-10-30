> Live review-site update (30 October 2026): use `/en/shop/checkout-test-150` for the no-goods **€1.50 total** test, with €0 delivery. The older local fixture below includes delivery and is not the live item. Keep the production bot webhook on Netlify; use a separate bot for local tunnel experiments. Current test evidence and remaining live checks are recorded in `docs/CRYPTO_CHECKOUT_VERIFICATION_2026-10-30.md`. The local notes below do not establish that a real mainnet payment or live receipt email has been verified.

# Telegram + crypto checkout — test runbook

How to exercise the whole buying flow end to end: the €1.50 fixture, the
Telegram invoice, a real USDC transfer, the settlement and the two
notifications.

Everything here was executed against the local environment while it was being
written. The screen names, the numbers and the error messages are what the
system actually produced.

---

## 0. Two ways to run this

| Target | Webhook URL | Cron | Best for |
| --- | --- | --- | --- |
| **Local** (`localhost:3000`) | a cloudflared tunnel | run it by hand | development, debugging, seeing the logs |
| **Netlify** (`averianlabs-demo.netlify.app`) | the deployed URL | Netlify's own schedule | the real end-to-end test from your phone |

Both work. The Netlify one is the more faithful test: a real public HTTPS
address, the scheduled function running on its own, and the same code that
production runs.

### The Netlify target needs one deploy

The hosted build seeds the €1.50 fixture, so the product appears on the
deployed site as soon as the build runs:

```
pnpm db:migrate → pnpm db:seed → pnpm db:seed-checkout-test-product → pnpm build
```

`SEED_TEST_PRODUCT=true` in `netlify.toml` is what turns the fixture on. The
build step is **non-fatal**: if the seed fails, the deploy still succeeds and
the site is unaffected.

**Remove that line from `netlify.toml` before this site takes real orders.**
A €1.50 fixture a customer can buy is a fixture a customer can buy. The
product is marked `local-test-fixture` and its certificate points at a
deliberately invalid URL, so it can never be mistaken for a real product — but
it is still for sale until the flag is gone.

After the deploy:

```bash
curl -s https://averianlabs-demo.netlify.app/api/crypto/chains
# {"chains":[{"id":"usdc_solana",...}],"available":true}

curl -s -o /dev/null -w "%{http_code}\n" \
  https://averianlabs-demo.netlify.app/en/shop/checkout-test-150
# 200
```

The build's Telegram plugin re-registers the webhook against the deployed URL
on every production deploy, so the bot follows the site automatically.

---

## 1. Bring the site up and make it reachable

| Thing | Value | Where it comes from |
| --- | --- | --- |
| The bot | `@Averianlabs_bot` | BotFather |
| The bot token | in `.env.local` | BotFather |
| The receiving wallet | `MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6` (Solana) | `.env.local` |
| The chain | `usdc_solana` | `.env.local` |
| The public URL | a cloudflared tunnel to `localhost:3000` | section 1 |
| A wallet with a little USDC | for the payment | your own wallet |

Solana USDC is the right chain for this test and there is no substitute worth
switching to:

- the transfer fee is about $0.00025, so the amount arrives exactly;
- the tolerance for the chain is `0` — an exact match, no shortfall allowed;
- one confirmation is final, so the settlement happens within seconds.

On Bitcoin a €1–3.50 network fee deducted from the transferred amount would be
far more than a €1.50 order, which is over the 5 % shortfall cap and would be
filed as underpayment for a human to resolve. That is the other reason the
fixture is worth the €1.50: it proves the exact-match path, not the
fee-tolerant one.

---

## 1. Bring the site up and make it reachable

Telegram delivers webhooks only over **HTTPS on ports 443, 80, 88 or 8443**.
`localhost:3000` is unreachable, so the bot would never receive a reply — not
even the *I have paid* button press.

```bash
./scripts/deploy-local-test.sh          # build + run the production server on :3000
```

Then put a tunnel in front of it:

```bash
cloudflared tunnel --url http://localhost:3000 --no-autoupdate
```

It prints a URL like `https://<words>.trycloudflare.com`. **It changes every
time cloudflared restarts** — the webhook has to be re-registered when it does.

Register the webhook against the tunnel:

```bash
set -a && source .env.local && set +a
pnpm telegram:setup-webhook https://<words>.trycloudflare.com
```

```
Webhook registered: https://<words>.trycloudflare.com/api/telegram/webhook
  bot            : @Averianlabs_bot
  pending updates : 0
  last error     : none
```

The script refuses to continue with a configuration Telegram would reject: a
secret outside `A-Z a-z 0-9 _ -`, a plain `http://` origin, or a port
Telegram does not deliver to.

Check the registration:

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo" | jq .result
```

`last_error_message` must be `null`. If it is not, Telegram could not deliver
and the reason is in there.

---

## 2. The test product

The live fixture is the one described in
`docs/CRYPTO_CHECKOUT_VERIFICATION_2026-10-30.md`:

| | |
| --- | --- |
| URL | `/en/shop/checkout-test-150` |
| SKU | `CHECKOUT-TEST-150` |
| Price and total | **€1.50**, including **€0 delivery** |
| Flag | `CHECKOUT_TEST_PRODUCT_ENABLED=true` |

It has no physical goods, no batch and no invented certificate — it exists
only so the payment flow can be exercised. A mainnet payment still transfers
real money.

```bash
# locally
CHECKOUT_TEST_PRODUCT_ENABLED=true pnpm tsx scripts/seed-checkout-test-product.ts
# [checkout-test] Ready: /en/shop/checkout-test-150; total EUR 1.50; no goods or shipment
```

The hosted build runs the same seed when the flag is on, so the item appears
on the review site as soon as the build runs. Set the flag to `false` and
redeploy to stop it being purchasable; the order history is kept.

---

## 3. The walkthrough

### 3.1 Buy it

1. Open `http://localhost:3000/en/shop/checkout-test-150`.
2. **Add to cart.**
3. **Cart → Continue.**
4. **Email** — any address. `continue as guest` works, no account needed.
5. **Address** — the checkout only accepts Finland. Any street and city.
6. **Shipping** — the fixture has no goods, so delivery is €0 and the total
   stays €1.50.
7. **Payment** — the *Cryptocurrency* option is there because the bot is
   configured. It lists **USD Coin (Solana)**.
8. Tick the terms box. The *Continue to Telegram* button stays disabled until
   you do.
9. **Continue to Telegram.**

The browser lands on:

```
https://t.me/Averianlabs_bot?start=kNMG8SIVXy0XVR9vxB0yKU
```

That is the only thing the browser is handed. The cart is not in the URL and
the amount is not in the URL: the bot reads the order from the server.

> The button is called *Continue to Telegram*, not *Continue*. Matching
> `/continue/i` in a test also matches the other steps' buttons.

### 3.2 What the bot says

Open the deep link in Telegram. The bot answers with the invoice. This is the
actual message, from a real order:

```
Your order AL-20261030-FBBC200AED2A

Checkout test — €1.50 · 1 vial × 1 — €1.50

Products        €1.50
Shipping        €0.00
VAT included    €0.31
Total           €1.50

Send exactly 1.676402 USDC
Rate locked for 59 more minutes.

Send only USDC on the USD Coin (Solana) network to this address:
MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6

Send any other asset, a different amount or the wrong network and the order will not clear.
Please pay before 2026-10-30 10:42.
```

with three buttons under it:

```
[ ✅ I have paid ]        → paid:<session>
[ 🔄 Check status ] [ 💬 Support ]
```

The amount comes from the server, at the rate locked when the order was
created. The invoice and the matching always use that same number, never a
fresh rate. The deadline is in **UTC**, because it is the stored timestamp.

### 3.3 Pay it

Send exactly the amount from the invoice, in USDC on **Solana**, to the
address in the invoice.

- Send it from the same wallet you will want to check afterwards, so the
  transaction hash is easy to find.
- Send the exact amount. The chain tolerance is zero: one unit less is
  underpayment.
- The fee is negligible, but send enough that the fee does not come out of
  the transferred amount.

Watch it land:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/crypto | jq
```

```json
{
  "chains": [
    {
      "chain": "usdc_solana",
      "configured": true,
      "scanned": 1,
      "newDeposits": 1,
      "matched": 1
    }
  ],
  "matched": [{ "...": "..." }],
  "expired": 0,
  "truncated": false,
  "telegram": { "sent": 2, "failed": 0, "skipped": false }
}
```

`matched: 1` is the deposit being matched to the invoice. `telegram.sent: 2`
is the confirmation to the buyer and the notification to the team.

### 3.4 What happens next

| # | What | Where |
| --- | --- | --- |
| 1 | The deposit is recorded and matched to the invoice | the database |
| 2 | The order becomes `paid` | the order |
| 3 | The buyer is told | the bot **edits** its own invoice message to "Payment received" |
| 4 | The team is told | the ops chat gets "💰 Paid — AL-… — pack and ship" |
| 5 | The receipt is queued | the email, by the same code path the card payments use |
| 6 | The confirmation page shows paid | `/en/checkout/confirm/<orderId>` |

The confirmation page polls, so it turns to *paid* on its own.

---

## 4. The schedule

Nothing settles itself. The watcher has to run.

**Locally**, run it by hand:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/crypto | jq
```

or leave a loop running for the duration of the test:

```bash
while true; do
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
    http://localhost:3000/api/cron/crypto > /dev/null
  sleep 120
done
```

**In production**, `netlify.toml` declares it and nothing else is needed:

```toml
[[scheduled_functions]]
  function = "cron-crypto"
  schedule = "*/2"
```

The Netlify wrapper adds the `Authorization: Bearer $CRON_SECRET` header,
because a Netlify scheduled invocation cannot carry custom headers.

---

## 5. The *I have paid* button

The button does not wait for the cron. It scans the chain for that one
invoice with a five-second budget and settles the order on the spot, which is
what a customer pressing it expects.

```bash
# what it would do, without the button
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/crypto | jq '.chains[0]'
```

If the button says the payment is still pending, the deposit is either not
there yet, has too few confirmations, or is short. The admin console lists
every deposit that belongs to no order:

```
/en/admin/orders/<orderId>  →  Manual deposit match
```

Type the transaction hash there to attach a deposit by hand. That path settles
the order exactly like an automatic match.

---

## 6. Troubleshooting

| What you see | Why | What to do |
| --- | --- | --- |
| No *Cryptocurrency* option at the payment step | `TELEGRAM_BOT_TOKEN` or `TELEGRAM_BOT_USERNAME` is missing, or no chain has an address | `curl -s localhost:3000/api/crypto/chains` |
| The deep link opens a "bot not found" page | `TELEGRAM_BOT_USERNAME` does not match the token's bot | `pnpm telegram:setup-webhook` compares the two and refuses to run |
| The bot answers but says the order is unknown | the session token is not the one for that order | open the link the browser was given, not a retyped one |
| `Bad Request: chat not found` in the log | the bot was asked to write to a chat it has never spoken in | add the bot to the chat, or use the id from the log |
| The invoice never arrives | the webhook is not registered, or points at a dead tunnel URL | `getWebhookInfo`, then re-register |
| `handler_failed` in the webhook response | the handler threw; the real error is in the log | read the server log |
| The order stays `awaiting_crypto` | the cron is not running | `curl -s -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/crypto` |
| The deposit is scanned but not matched | the amount is short, or it belongs to another order | the admin console's manual match |
| `explorer_not_configured` for a chain | the explorer key is missing | `ETHERSCAN_API_KEY` / `TRONGRID_API_KEY`. Solana needs none |
| `no_rate` | the rate source is down and there is no fallback | set `CRYPTO_FALLBACK_RATES` |

### The ops chat id

`TELEGRAM_OPS_CHAT_ID` is the group's numeric id, a negative number. To find
it: add the bot to the group and send it a message. In a group the bot only
answers to a command that mentions it, so send `/start@Averianlabs_bot`.

```
[telegram] update 502572351 from chat <ops-group-chat-id>: /start@averianlabs_bot
```

The number after `from chat` is the id to put in `TELEGRAM_OPS_CHAT_ID`.

The same line is how a *customer's* chat id is found, which matters when
testing with a private chat instead of a group.

---

## 7. Cleaning up

```bash
CHECKOUT_TEST_PRODUCT_ENABLED=false pnpm tsx scripts/seed-checkout-test-product.ts
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" -d url=""   # remove the webhook
```

The tunnel URL is ephemeral. When it changes, the old registration points at a
dead endpoint and updates are lost after Telegram's 24-hour retention window,
so re-run `pnpm telegram:setup-webhook` with the new URL.

---

## Related documents

- `docs/TELEGRAM_BOT_SETUP_2026-10-26.md` — the full bot setup.
- `docs/STORE_AND_TELEGRAM_CRYPTO_PLAN_2026-10-23.md` — the design.
- `docs/STORE_HARDENING_2026-10-23.md` — the delivery ledger.
