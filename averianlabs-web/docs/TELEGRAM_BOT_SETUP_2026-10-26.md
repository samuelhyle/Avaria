# Telegram Bot Setup — Averian Labs

Complete instructions for bringing the cryptocurrency checkout online. Everything
below is verified against the implementation in this repository; the file and
line references are the actual code paths.

---

## 1. What the bot is for

The crypto checkout is not a "send money to this address" flow. The customer
is handed over to a Telegram bot, which:

1. Receives the deep link `https://t.me/<bot_username>?start=<token>` when the
   customer chooses *Cryptocurrency* at the payment step
   (`lib/crypto/session.ts`).
2. Shows the exact amount, the receiving address and the deadline
   (`lib/telegram/handlers.ts`).
3. Offers an **I have paid** button that performs a real on-chain check with a
   5-second budget and settles the order when the deposit is found.
4. Confirms to the customer and notifies the team in the ops chat.

The bot also notifies the team when a crypto invoice is opened and its payment settles.

**Consequence:** the crypto option is only offered in the checkout when the bot
is actually configured. The checkout reads `/api/crypto/chains`, which reports
`available: false` without `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`, and
the payment method list then omits cryptocurrency entirely
(`components/checkout/CheckoutForm.tsx`). If you cannot see the option in the
checkout, one of those two variables is missing.

### The one thing that surprises people

**The bot does not poll Telegram.** Updates arrive by webhook, and the
application reads the blockchain on a schedule. Two independent pieces of
infrastructure are required:

| Piece | What it does | If missing |
|---|---|---|
| Webhook (`/api/telegram/webhook`) | Delivers customer messages and button presses | The bot never answers the customer |
| Crypto cron (`/api/cron/crypto`) | Polls the blockchain, settles deposits, delivers Telegram outbox | No automatic payment detection |
| Maintenance cron (`/api/cron/maintenance`) | Delivers receipts/outboxes and expires holds | Receipts and housekeeping stop |

A registered bot can issue invoices and check payment when **I have paid** is
pressed, but automatic detection and queued notifications require the schedules.

---

## 2. Before you start

You need:

- A Telegram account (a phone number is enough to run BotFather).
- A Telegram **group** for the team notifications.
- The site deployed at a public HTTPS address (production is Netlify).
- A receiving wallet address per accepted chain.
- Node 24 and pnpm, to run the setup script.

---

## 3. Step 1 — Create the bot

1. Open Telegram and start **@BotFather**.
2. Send `/newbot` and follow the prompts: a display name, then a username.
   The username must end in `bot` and be globally unique.
3. BotFather replies with the token:

   ```
   Use this token to access the HTTP API: 7123456789:AAF-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   **This token is the bot's password.** Anyone holding it can read every
   message sent to the bot and act as the bot. Never commit it, never put it
   in `NEXT_PUBLIC_*` variables, never paste it into a ticket.

4. Optional but recommended — tell customers what the bot is for:

   ```
   /setdescription
   ```

5. The command menu is published automatically by the setup script in step 6,
   so `/start`, `/status`, `/order` and `/help` appear in the customer's chat.

### Rotating a leaked token

In BotFather: `/token` → pick the bot → choose a new token. Then update
`TELEGRAM_BOT_TOKEN` in Netlify and re-run the setup script (step 6). The old
token stops working immediately.

---

## 4. Step 2 — Generate the shared secrets

Two secrets are needed.

### `TELEGRAM_WEBHOOK_SECRET`

Telegram sends this in the `X-Telegram-Bot-Api-Secret-Token` header on every
webhook call, and the site rejects anything that does not match. The Bot API
**only accepts 1–256 characters from `A-Z`, `a-z`, `0-9`, `_` and `-`** and
refuses the whole `setWebhook` call otherwise.

```bash
openssl rand -hex 32
```

Hex is safe: it contains only `0-9` and `a-f`. **Do not use `openssl rand
-base64`** — base64 can contain `/`, `+` and `=`, which Telegram rejects, and
the failure surfaces as a confusing API error rather than a clear one.

### `TELEGRAM_INTERNAL_SECRET`

A shared secret for bot-to-site service calls. It is validated on boot but not
yet consumed by any code path — set it now so it is not missing later.

```bash
openssl rand -hex 32
```

> The site validates the webhook secret's character set at startup
> (`lib/env.ts`). A bad value fails the deploy immediately instead of failing
> silently on the first customer payment.

---

## 5. Step 3 — Set the environment variables

In Netlify: **Site configuration → Environment variables → Production**. Add:

| Variable | Value | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | the token from BotFather | server only |
| `TELEGRAM_BOT_USERNAME` | `AverianLabsBot` | **without** the `@` |
| `TELEGRAM_WEBHOOK_SECRET` | `openssl rand -hex 32` | 16–256 chars, `A-Za-z0-9_-` only |
| `TELEGRAM_INTERNAL_SECRET` | `openssl rand -hex 32` | 16+ chars |
| `TELEGRAM_OPS_CHAT_ID` | see step 4 below | negative for a group |
| `CRYPTO_ENABLED_CHAINS` | e.g. `usdc_solana` | `btc`, `eth`, `usdt_trc20`, `usdt_erc20`, `usdc_solana` |
| `CRYPTO_WALLET_ADDRESSES` | `btc=bc1…,usdt_trc20=T…` | one address per chain |
| `CRYPTO_RATE_API_URL` | a CoinGecko-style URL | optional, falls back to `CRYPTO_FALLBACK_RATES` |
| `CRYPTO_FALLBACK_RATES` | `btc=92000,usdt_trc20=0.92` | used when the rate API is down |

Set them in **Preview** too if you want to test on a deploy preview.

### Explorer keys

The blockchain watcher needs a way to list deposits:

| Chain | Variable | Required? |
|---|---|---|
| Bitcoin | — | no, mempool.space needs no key |
| Ethereum, USDT (ERC-20) | `ETHERSCAN_API_KEY` | yes |
| USDT (TRC-20) | `TRONGRID_API_KEY` | yes |
| Native USDC (Solana mainnet) | `SOLANA_RPC_URL` | yes, HTTPS mainnet JSON-RPC endpoint |

Without the key for a chain, the watcher reports
`explorer_not_configured` for that chain and skips it — the other chains keep
working.

---

## 6. Step 4 — Create the team chat and find its id

1. In Telegram, create a group, e.g. **Averian Labs Ops**.
2. Add the bot as a member. The bot only *sends* messages into this chat, so it
   does **not** need to be an administrator unless the group restricts posting.
3. After deployment and webhook registration, send `/start@YourBotUsername`
   in the group. An explicitly addressed command reaches a privacy-enabled bot;
   an ordinary `hello` may not. A private chat gives a different chat ID.

The chat id appears in the application log:

```
[telegram] update 1 from chat -1001234567890: hello
```

4. Copy that number into `TELEGRAM_OPS_CHAT_ID` in Netlify and redeploy.

The id is negative for a group (`-100…`), positive for a private chat. If the
bot is removed from the group, Telegram returns `403 bot was kicked` and the
team stops receiving order notifications — nothing else in the product fails.

> The bot's privacy mode only decides which **group** messages the bot can
> read. This bot never needs to read them, so the default setting is fine.

---

## 7. Step 5 — Deploy the site

Deploy to Netlify with the variables from step 3. Confirm the site is up:

```bash
curl -s https://your-site.example/api/health
```

The site must be reachable over **HTTPS** — Telegram refuses plain `http://`.

---

## 8. Step 6 — Register the webhook

Telegram delivers updates to exactly one HTTPS endpoint. Register it with the
setup script, which also publishes the command menu and reads the registration
back so a typo is caught immediately.

Hosted production deployments now register the webhook automatically in the
`telegram-webhook` build plugin's `onSuccess` hook. It uses the production
secrets inside Netlify, verifies the token's bot username, publishes commands,
and checks the registered URL. Preview and local builds never move the webhook.

For manual registration, run **from your machine**, with the production token,
username, and secret in the environment:

```bash
TELEGRAM_BOT_TOKEN='7123456789:AAF-…' \
TELEGRAM_BOT_USERNAME='YourBotUsername' \
TELEGRAM_WEBHOOK_SECRET='<the hex value>' \
pnpm telegram:setup-webhook https://your-site.example
```

Expected output:

```
Webhook registered: https://your-site.example/api/telegram/webhook
  pending updates : 0
  last error     : none
```

The script refuses to continue with a configuration Telegram would reject:

- `TELEGRAM_WEBHOOK_SECRET` shorter than 16 or longer than 256 characters
- `TELEGRAM_WEBHOOK_SECRET` containing anything outside `A-Za-z0-9_-`
- an `http://` origin
- a port other than 443, 80, 88 or 8443 — **Telegram only delivers webhooks on
  these ports**

### Doing it by hand

If you prefer the raw API call:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d url="https://your-site.example/api/telegram/webhook" \
  -d secret_token="<the hex value>" \
  -d allowed_updates='["message","callback_query"]'
```

### Verify

```bash
curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

```json
{
  "ok": true,
  "result": {
    "url": "https://your-site.example/api/telegram/webhook",
    "pending_update_count": 0,
    "last_error_message": null
  }
}
```

Check `last_error_message` — Telegram reports delivery problems there, such as
a TLS error or a timeout.

### Removing the webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d url=""
```

---

## 9. Step 7 — Schedule the crypto watcher

The watcher is what notices a deposit and settles the order.

**Production (Netlify).** `netlify.toml` already declares both schedules, so
nothing is needed if the site is deployed on Netlify:

```toml
[functions."cron-crypto"]
  schedule = "*/2 * * * *"

[functions."cron-maintenance"]
  schedule = "*/5 * * * *"
```

The Netlify wrapper functions add the `Authorization: Bearer $CRON_SECRET`
header, because a Netlify scheduled invocation cannot carry custom headers.
Set `CRON_SECRET` in Netlify to a random 32+ character string.

**Verifying the schedule.** Run the route by hand — it accepts the same
header:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://your-site.example/api/cron/crypto
```

```json
{
  "ok": true,
  "chains": [
    { "chain": "btc", "configured": true, "scanned": 12, "newDeposits": 0, "matched": 0 }
  ]
}
```

`configured: false` means the wallet address or the explorer key is missing for
that chain. `error: "no_receiving_address"` means the address is missing;
`error: "explorer_not_configured"` means the API key is missing.

**Self-hosted.** Add to crontab, every two minutes:

```
*/2 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-site.example/api/cron/crypto
```

The GitHub Actions workflow (`.github/workflows/maintenance.yml`) is only a
fallback and does nothing unless `MAINTENANCE_BASE_URL` is set.

---

## 10. Step 8 — Configure the wallet

The customer must send to an address you control. One address per chain:

```
CRYPTO_ENABLED_CHAINS=btc,usdt_trc20
CRYPTO_WALLET_ADDRESSES=btc=bc1qyourbtcaddress…,usdt_trc20=TYourTronAddress
```

or a single address for every enabled chain:

```
CRYPTO_WALLET_ADDRESS=TYourAddress
```

Both formats are supported; the per-chain map wins.

**Use a fresh address per chain and monitor it.** The watcher scans the address
you configure on every sweep. A shared "hot" address across many customers
makes matching ambiguous.

---

## 11. Step 9 — Test the whole flow

1. **The bot answers.** Open `https://t.me/<bot_username>` and press Start.
   The bot replies with a welcome message.
2. **The deep link works.** Open
   `https://t.me/<bot_username>?start=abc123` — the bot greets you and ignores
   the unknown token rather than crashing.
3. **The checkout offers crypto.** Add a product to the cart, walk to the
   payment step, and look for the *Cryptocurrency* option. If it is missing,
   `TELEGRAM_BOT_TOKEN` or `TELEGRAM_BOT_USERNAME` is wrong.
4. **The invoice is issued.** Choose cryptocurrency, pick a chain, and press
   Continue. The browser opens Telegram with the order in it: exact amount,
   address, deadline.
5. **The team is notified.** The ops chat receives a message with the order.
6. **The payment settles.** Send a small real amount from a test wallet to the
   address shown. The cron checks every two minutes; after the chain's required
   finality/confirmations the order becomes *paid* and notifications are delivered.
7. **The button works.** Press *I have paid* on the invoice — the bot checks
   the chain immediately instead of waiting for the cron.

### A note on test amounts

Do not test with a large transfer. The customer is charged the exact amount
the site computed, and any surplus is not refunded automatically. Test with the
smallest possible amount on the cheapest chain you have enabled.

---

## 12. Troubleshooting

### The checkout does not offer cryptocurrency

`/api/crypto/chains` reports `available: false`. Check:

```bash
curl -s https://your-site.example/api/crypto/chains
```

```json
{ "chains": [], "available": false }
```

- `TELEGRAM_BOT_TOKEN` missing or empty.
- `TELEGRAM_BOT_USERNAME` missing, or set with a leading `@`.
- `CRYPTO_ENABLED_CHAINS` empty or naming an unknown chain.
- No receiving address for the enabled chains.

The list is read at runtime, so a redeploy is needed after changing the
variables.

### The bot does not respond

- Check the webhook is registered: `getWebhookInfo`. A `url` of `""` means
  someone removed it.
- Check `last_error_message`. A TLS error means the certificate is not trusted
  by Telegram.
- Check the site log for `401 unauthorized` — the secret in Netlify and the
  secret registered with Telegram have drifted apart. Re-run the setup script.
- Check for `503 not_configured` — the token is missing on the server.

### The webhook returns `handler_failed`

The update arrived and was authenticated, but the handler threw. The
application log carries the underlying error. The most common cause is a
placeholder token: with the token from `.env.local` the Bot API answers
`401 Unauthorized`, which surfaces here rather than crashing the site.

### The webhook returns `duplicate`

Telegram retried an update that was already processed. The site answers
`200 {"ok":true,"duplicate":true}` on purpose — this is how retries are made
safe, and it is not an error.

### The bot invoices but never confirms the payment

The webhook works and the cron does not. Run the cron by hand and read the
output: a missing `CRON_SECRET`, an `Authorization` header that never reaches
the route, or a chain with no explorer key all look like this from the
customer's side.

### `403 bot was kicked` or `404 chat not found`

The bot is not in the ops chat, or the chat id is wrong. Re-add the bot and
check the id in the log.

### The customer paid but the amount is not accepted

The watcher compares wallet, amount, and the chain's payment timestamp against
the invoice window. USDC has no shortfall tolerance; overpayments may qualify.
Historical payments cannot settle new invoices. A payment compatible with more
than one overlapping invoice is left unmatched for manual review, including if
one invoice subsequently closes. See the operations runbook.

---

## 13. Security notes

- The bot token is a credential. It grants full control of the bot. Server
  environment variables only; never a `NEXT_PUBLIC_` variable, never in git.
- The webhook secret stops anyone else from posting fake updates to the site.
  Rotate it by updating Netlify and re-running the setup script.
- The webhook route answers `503` when the token or secret is missing, so the
  site runs without the bot rather than failing to start.
- Updates are recorded in the `webhook_events` table and de-duplicated by
  `update_id`, so a retry can never invoice a customer twice.
- Telegram retries a failed delivery. The route answers `200` even when the
  handler fails, so a persistent error does not turn into a retry storm.
- The customer never computes the crypto amount. The server derives it, and
  the invoice carries that same number.

---

## 14. Command reference

```bash
# Register the webhook and publish the command menu
pnpm telegram:setup-webhook https://your-site.example

# Watch the crypto settlements (local, with the cron secret)
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/crypto

# See what the site thinks is configured
curl -s http://localhost:3000/api/crypto/chains

# The bot's identity (confirms the token works)
curl -s "https://api.telegram.org/bot<TOKEN>/getMe"

# The webhook registration
curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Remove the webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d url=""
```

---

## 15. Testing against a local server

Telegram cannot reach `http://localhost:3000`: the URL must be HTTPS and on
port 443, 80, 88 or 8443. To test locally, put a tunnel in front of the local
server:

```bash
cloudflared tunnel --url http://localhost:3000
# or
ngrok http 3000
```

Then register the tunnel URL:

```bash
TELEGRAM_BOT_TOKEN='…' TELEGRAM_BOT_USERNAME='YourBotUsername' TELEGRAM_WEBHOOK_SECRET='…' \
pnpm telegram:setup-webhook https://your-tunnel-host.example
```

Remember to re-register the production URL when the tunnel is shut down —
otherwise Telegram keeps posting to a dead endpoint and every update is lost
after the 24-hour retention window.

---

## 16. Native USDC on Solana — configured 30 October 2026

The production environment on `averianlabs-demo.netlify.app` uses these values
in the published deployment. The local `.env.local` public crypto
settings match them; Telegram credentials remain in Netlify's secret store.

```dotenv
TELEGRAM_BOT_USERNAME=Averianlabs_bot
CRYPTO_ENABLED_CHAINS=usdc_solana
CRYPTO_WALLET_ADDRESSES=usdc_solana=MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6
CRYPTO_WALLET_ADDRESS=
CRYPTO_RATE_API_URL=https://api.coingecko.com/api/v3/simple/price
CRYPTO_FALLBACK_RATES=
SOLANA_RPC_URL=https://api.mainnet.solana.com
```

Telegram verified the token belongs to `@Averianlabs_bot`; the originally supplied
`avarianlabs_bot` spelling was corrected. The username is public configuration.

`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_INTERNAL_SECRET`, and
`CRON_SECRET` are already present as production secrets. The bot token is not a
`NEXT_PUBLIC_*` variable and must not be committed. Netlify uses uppercase,
case-sensitive variable names. Setting variables alone does not publish code.

`usdc_solana` quotes CoinGecko's `usd-coin` asset in EUR, locking the resulting
rate on each invoice. The fixed fallback is intentionally empty: if a live rate
cannot be obtained, invoicing stops until the rate service recovers. Never use
`usdc_solana=1` to mean one US dollar; the configured number is EUR per USDC.

The native mainnet mint is
`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, verified against
[Circle's registry](https://developers.circle.com/stablecoins/usdc-contract-addresses).
The receiving address is the wallet owner address, not the token mint or an
associated token account. Payment links follow
[Solana Pay](https://docs.solanapay.com/spec), including `spl-token` and the exact
USDC amount. Transfers must use Solana mainnet and native USDC.

The verifier checks the RPC's mainnet genesis, successful finalized transactions,
the native mint, wallet ownership, and integer token-balance increases. SOL,
other tokens, failed transfers, and internal moves between the wallet's own
accounts do not pay an invoice. The receiving wallet had no on-chain account or
USDC token account during the initial read-only check; an unused wallet can be
funded normally, with an associated token account created by the sending wallet.

The public RPC was reachable for the initial checks. For sustained traffic,
replace `SOLANA_RPC_URL` with a dedicated mainnet provider endpoint; Solana's
[cluster documentation](https://solana.com/docs/references/clusters) describes
the public endpoint's rate limits. The watcher scans up to the 25 newest unique
finalized transactions across at most eight current USDC accounts within a
single deadline. This is recent-deposit polling; a large backlog or a closed
token account may require manual reconciliation.

Deploy the current integration through a hosted Netlify production build. The
root `netlify.toml` and app copy both include the cron schedules and post-deploy
webhook plugin. The plugin only registers after a successful production deploy,
using secrets inside Netlify; previews never move the production webhook.
`TELEGRAM_OPS_CHAT_ID` is now saved as a production secret, using the group ID
provided by the owner. Telegram getChat/getChatMember checks verified the group,
bot membership, and permission to send messages. The published production environment
includes the setting. Complete a small real checkout before accepting
customer payments.

Verification on 30 October: Node 24.22.0, 481 unit tests passed (four unrelated
optional tests skipped), 28 crypto integration tests passed on an isolated
localhost database, production Next.js build and all route bundle budgets
passed. The USDC integration test uses mocked RPC responses and exercises both
historical-transfer rejection and a fresh finalized payment through settlement.
The local checks used mocked transfers; no real payment was made.

### Hosted publication

The current published deployment is recorded in the verification report below
and serves the existing Netlify review site. The manual publish lock and `noindex` setting were preserved.
The hosted build verified a private database backup, applied all twelve
migrations, passed the production build/bundle/secret checks, and registered
the webhook after verifying the bot identity and URL readback.

The live health, checkout, chain-list, and webhook status endpoints return 200.
Invalid webhook secrets and unauthenticated cron calls return 401. The crypto
cron was observed running successfully with `usdc_solana` configured; the
maintenance cron also returned success. The customer's private Start was
received and recorded. Ops notifications use the owner-provided group ID;
Telegram verified that the bot is a member and can send messages there. The
private chat was not substituted for the team group.

Sanitized deployment evidence is recorded in
`docs/verification/telegram-usdc-deployment-2026-10-30/deployment.json`.

---

## Related documents

- `docs/STORE_AND_TELEGRAM_CRYPTO_PLAN_2026-10-23.md` — the design.
- `docs/RESEARCH_CUSTOMER_RELEASE_RUNBOOK.md` — operations runbook.
- `docs/STORE_HARDENING_2026-10-23.md` — the delivery ledger.
