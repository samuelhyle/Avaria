# Crypto checkout verification — 30 October 2026

Live review site: https://averianlabs-demo.netlify.app

## Customer journey

1. Add an available item, continue as a guest (or use an account), and enter the checkout address.
2. Choose delivery, then **Cryptocurrency → USD Coin (Solana)**, accept the checkout terms, and choose **Continue to Telegram**.
3. The server prices and reserves the order, locks its EUR/USDC quote, and creates an opaque invoice token. The browser keeps the signed order-status page open and opens the bot in a separate window. If the popup is blocked, use **Open invoice in Telegram** on the order page.
4. Press **Start** in the customer's own private conversation with **@Averianlabs_bot**. The token connects that invoice to that Telegram customer; knowing a customer's shop email is not enough to send them a Telegram message. The private chat is bound atomically and cannot be reassigned by opening the same token from another account. Group chats cannot receive customer invoice details.
5. The invoice shows the exact USDC amount, receiving address, network and UTC deadline. The buyer sends the displayed amount using native USDC on Solana mainnet. The bot's **I have paid** button checks the chain; it does not approve a payment based on the button press.
6. The scheduled watcher also checks every two minutes. A qualifying finalized transfer settles the order, queues buyer and ops notifications, and clears the purchased cart quantities when the browser sees the paid state. Stock or evidence problems put a paid transfer into manual review, without a dispatch instruction.

The amount is converted from EUR. A €1.50 order is not necessarily 1.50 USDC. Use the exact current invoice amount. An old transfer, another token, an unfinalized transfer or a short payment cannot automatically pay this USDC invoice. Ambiguous shared-wallet amount matches require review.

## Live test item

- URL: https://averianlabs-demo.netlify.app/en/shop/checkout-test-150
- SKU: `CHECKOUT-TEST-150`.
- Price and total: **€1.50**, including **€0 delivery**.
- One per checkout, purchased separately without a promotion code.
- Explicitly no physical goods or shipment. A mainnet payment still transfers real money.
- No invented scientific batch, assay, purity or certificate. The dedicated fixture is narrowly identified by a feature flag, SKU, slug, price, product type and ownership marker. Ordinary catalogue evidence gates remain active.
- `CHECKOUT_TEST_PRODUCT_ENABLED=true` provisions it during the approved review-site build. The seed preserves remaining stock and existing holds on reruns. Set the flag to `false` and redeploy to disable purchases; retain order history.

## Configuration

The Netlify production environment contains the bot token, webhook secret, ops group identifier and cron secret as secrets. Do not put them into this document or public browser configuration.

Public configuration:

```dotenv
TELEGRAM_BOT_USERNAME=Averianlabs_bot
CRYPTO_ENABLED_CHAINS=usdc_solana
CRYPTO_WALLET_ADDRESSES=usdc_solana=MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6
CRYPTO_RATE_API_URL=https://api.coingecko.com/api/v3/simple/price
SOLANA_RPC_URL=https://api.mainnet.solana.com
CHECKOUT_TEST_PRODUCT_ENABLED=true
```

There is no fixed EUR fallback rate. If no valid quote is available, the server refuses to invent an invoice amount. The Solana adapter checks mainnet identity and native USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, matching [Circle's published address](https://developers.circle.com/stablecoins/usdc-contract-addresses). Customer routing follows [Telegram's deep-link mechanism](https://core.telegram.org/bots/features#deep-linking).

The production webhook stays on `/api/telegram/webhook` on Netlify. Use a separate bot for local tunnel experiments. Both the webhook and scheduled `/api/cron/crypto` processing are required.

## Executed checks

- TypeScript: passed.
- Dedicated local database, separate from the developer's existing database and servers; migrated and seeded with isolated fixtures, dummy credentials and local provider mocks. The temporary server, mocks and database were stopped after verification.
- Crypto integration: **32/32 passed**, covering pricing, matching, concurrent invoice retries, private-chat ownership, callback acknowledgement, settlement, expiration and payment review.
- Full browser journey: **1/1 passed**, from the actual product page through guest checkout, a real HTTP checkout request, webhook invoice delivery, rejected transfer cases, finalized simulated USDC settlement, scheduled Telegram outbox delivery, mocked receipt-provider delivery, order polling and cart clearance.
- HTTP webhook: duplicate update does not resend the invoice; incorrect secret rejected.
- Simulated providers were used for Telegram, Resend and Solana during the browser test. This is not a claim of real Telegram message delivery, email delivery or mainnet payment.
- Broader unit run: **471 passed, 10 failed, 4 skipped**. Failures are in catalogue-answer expectations (6), footer rendering selectors (2), and product-card compare controls (2), outside the changed crypto path.
- Broad lint also reports errors in existing shop work. Targeted checks for the checkout changes and test helpers were run; the broader suite is not represented as clean.

Reproducible test entry points are `tests/integration/telegram-crypto.test.ts`, `tests/integration/crypto-matching-safety.test.ts`, `tests/integration/crypto-deposits.test.ts`, `tests/integration/checkout-test-product.test.ts`, and `playwright.crypto.config.ts`. The complete browser suite requires the dedicated local fixture, mock servers on ports 3456/3457, and dummy-only `CRYPTO_E2E_MOCK_ORIGIN` configuration. Never run it against production or load real provider credentials into it.

## Remaining live checks

Email is pending at the owner's explicit request. Netlify has no `RESEND_API_KEY` or `RESEND_FROM_EMAIL`; real email receipts have not been verified. Payment settlement can queue a receipt for later delivery, but queueing does not prove delivery.

A real mainnet transfer requires the wallet owner's action. Create a fresh invoice from the live item, open it privately in Telegram, send exactly the invoice amount on Solana, then verify the transaction, paid order page, buyer confirmation and ops group notification. Do not send an additional payment merely because a previous one has not appeared; check the transaction and contact support first.

Deployment and live browser results are recorded alongside this report after publication.

## Published live result

Published deploy: `6ae471f231d7f9c2ea334b01` at 2026-10-30T10:36:14.833Z. Production compilation, bundle budgets, native runtime tracing and secret scanning passed. The existing manual publication lock and review-site noindex were preserved.

The live browser passed checkout and invoice creation with a €1.50 total and €0 shipping. A retry returned the same invoice; unsigned status access was rejected; no page errors occurred. No payment or Telegram customer message was sent by the live browser. Its unpaid order was subsequently expired, with its single reservation released. A narrowly guarded hosted verification job performed that cleanup, checked the webhook and RPC, then intentionally stopped before deployment. The published application was verified afterward.

The production webhook reported its expected URL, zero pending updates and no delivery error. A real scheduled crypto run succeeded with Solana configured, no scan error, and zero failed Telegram deliveries. The mainnet genesis check also succeeded. Private invoice delivery and the ops-order notification were subsequently verified. A real mainnet payment still requires the owner's action.

An older `test-usdc-1-50` fixture also exists in production; it is separate from the new no-goods item and was not used for this live checkout. Use `checkout-test-150` for the €1.50 total test. Test fixture data is not supplier evidence.

Sanitized evidence: [results](verification/crypto-checkout-2026-10-30/results.json) and [live checkout screenshot](verification/crypto-checkout-2026-10-30/live-checkout.png). Signed order URLs, Telegram invoice tokens, bot credentials and chat identifiers are omitted from this report.

## Owner confirmation

The owner confirmed that the checkout invoice arrived in their private Telegram conversation. This verifies actual customer invoice delivery in addition to the simulated journey. Real mainnet payment and ops-notification delivery are being checked separately; email remains pending by request.

## Production invoice and ops delivery audit

After the owner confirmed receipt, a read-only production audit verified one delivered €1.50 USDC/Solana invoice bound to a private customer chat. The order is awaiting payment and no matching deposit has been recorded. The new-order ops notification was accepted by Telegram on its first delivery attempt, and its destination matches the configured ops group. Webhook registration is correct, with zero pending updates and no delivery error. The audit intentionally stopped before deployment and did not change the order, its invoice or its deadline.

The invoice expires at 30 October at 13:40 (Europe/Helsinki). The remaining live-payment step is for the wallet owner to pay the exact amount on an unexpired invoice using Solana, then provide the transaction signature for verification. Email remains pending by request.
