/**
 * The rules Telegram imposes on a webhook.
 *
 * The Bot API accepts an HTTPS URL on a small set of ports, and a secret
 * token from a small character set. Both are checked before the `setWebhook`
 * call, because Telegram rejects the whole request otherwise and the error
 * it returns does not explain which of the two was wrong.
 */

/** The only ports Telegram delivers webhooks to. */
export const WEBHOOK_PORTS = ["443", "80", "88", "8443"] as const

/** The characters Telegram allows in a webhook secret token. */
const SECRET_PATTERN = /^[A-Za-z0-9_-]+$/

/**
 * The webhook secret has to survive the round trip through the
 * `X-Telegram-Bot-Api-Secret-Token` header, which only carries
 * `A-Z`, `a-z`, `0-9`, `_` and `-`.
 */
export function assertWebhookSecret(secret: string): void {
  if (secret.length < 16) throw new Error("TELEGRAM_WEBHOOK_SECRET must be at least 16 characters")
  if (secret.length > 256) throw new Error("TELEGRAM_WEBHOOK_SECRET may be at most 256 characters")
  if (!SECRET_PATTERN.test(secret))
    throw new Error(
      "TELEGRAM_WEBHOOK_SECRET may only contain A-Z, a-z, 0-9, _ and - — Telegram refuses the whole setWebhook call otherwise.",
    )
}

/**
 * The full webhook URL for a site origin.
 *
 * Throws with an actionable message when Telegram would not be able to reach
 * the address, rather than letting the API return an opaque error.
 */
export function webhookUrlFor(origin: string): string {
  const parsed = new URL(origin)
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/")
    throw new Error("Pass only the site origin, without credentials, a path, query, or fragment")
  if (parsed.protocol !== "https:")
    throw new Error(
      `Telegram only accepts an HTTPS webhook URL (got ${parsed.protocol}//). Put a tunnel in front of the local server, or use a deployed preview.`,
    )
  const port = parsed.port || "443"
  if (!(WEBHOOK_PORTS as readonly string[]).includes(port))
    throw new Error(
      `Telegram only delivers webhooks on ports ${WEBHOOK_PORTS.join(", ")} (got ${port}).`,
    )
  return `${parsed.origin}/api/telegram/webhook`
}
