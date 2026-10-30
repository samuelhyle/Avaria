/**
 * Register the Telegram webhook with the Bot API.
 *
 * Telegram delivers updates to a single HTTPS endpoint. This points it at the
 * site, attaches the shared secret so the webhook route can reject anything
 * that did not come from Telegram, publishes the command menu, and then reads
 * the registration back so a typo does not go unnoticed.
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=… TELEGRAM_BOT_USERNAME=… TELEGRAM_WEBHOOK_SECRET=… \
 *   pnpm telegram:setup-webhook https://your-site.example
 *
 * With no argument it uses NEXT_PUBLIC_SITE_URL, falling back to AUTH_URL.
 *
 * Telegram only accepts an HTTPS URL, and only on ports 443, 80, 88 and 8443.
 * A local `http://localhost:3000` cannot be reached: put a tunnel in front of
 * the local server, or run the watcher against a deployed preview.
 */
import { setupTelegramWebhook } from "@/lib/telegram/setup"

async function main() {
  const origin = process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL
  if (!origin) throw new Error("Pass the site origin as the first argument")
  const info = await setupTelegramWebhook(origin)
  console.log(`Webhook registered: ${info.url}`)
  console.log(`  bot            : @${info.username}`)
  console.log(`  pending updates : ${info.pending_update_count}`)
  console.log(`  last error     : ${info.last_error_message ?? "none"}`)
  console.log("")
  console.log("Next:")
  console.log(`  1. Add the bot to the team chat and send /start@${info.username}.`)
  console.log("     The chat id is in the application log — copy it into")
  console.log("     TELEGRAM_OPS_CHAT_ID.")
  console.log("  2. Schedule /api/cron/crypto every two minutes so deposits are noticed.")
  console.log("  3. Place a test order and choose Cryptocurrency at the payment step.")
}

main().catch((error) => {
  let message = error instanceof Error ? error.message : "Telegram setup failed"
  for (const secret of [process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_WEBHOOK_SECRET])
    if (secret) message = message.split(secret).join("[redacted]")
  console.error(message)
  process.exit(1)
})
