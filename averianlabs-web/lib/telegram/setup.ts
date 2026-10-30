import { getServerEnv } from "@/lib/env"
import {
  getTelegramMe,
  getTelegramWebhookInfo,
  setTelegramCommands,
  setTelegramWebhook,
} from "@/lib/telegram/client"
import { assertWebhookSecret, webhookUrlFor } from "@/lib/telegram/webhook"

/** Configure the existing bot only after checking its identity and destination. */
export async function setupTelegramWebhook(origin: string) {
  const env = getServerEnv()
  const secret = env.TELEGRAM_WEBHOOK_SECRET
  const username = env.TELEGRAM_BOT_USERNAME
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is required")
  if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET is required")
  if (!username) throw new Error("TELEGRAM_BOT_USERNAME is required")
  assertWebhookSecret(secret)
  const url = webhookUrlFor(origin)
  const bot = await getTelegramMe()
  if (bot.username.toLowerCase() !== username.replace(/^@/, "").toLowerCase())
    throw new Error("TELEGRAM_BOT_TOKEN belongs to a different bot than TELEGRAM_BOT_USERNAME")
  if (!(await setTelegramWebhook(url, secret)))
    throw new Error("Telegram did not confirm the webhook")
  if (
    !(await setTelegramCommands([
      { command: "start", description: "Open your order" },
      { command: "status", description: "Check a payment" },
      { command: "order", description: "Your latest order" },
      { command: "help", description: "What the bot can do" },
    ]))
  )
    throw new Error("Telegram did not confirm the command menu")
  const info = await getTelegramWebhookInfo()
  if (info.url !== url) throw new Error("Telegram's registered webhook URL differs from this site")
  return { ...info, username: bot.username }
}
