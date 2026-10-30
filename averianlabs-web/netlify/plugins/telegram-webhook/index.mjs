import { execFile } from "node:child_process"
import { fileURLToPath } from "node:url"

const appDirectory = fileURLToPath(new URL("../../../", import.meta.url))
const botVariables = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_USERNAME", "TELEGRAM_WEBHOOK_SECRET"]

function hostedProduction(constants) {
  return (
    constants?.IS_LOCAL === false &&
    process.env.NETLIFY === "true" &&
    process.env.CONTEXT === "production" &&
    Boolean(process.env.DEPLOY_ID)
  )
}

function configuredOrigin() {
  if (!botVariables.some((key) => process.env[key]?.trim())) return null
  const missing = botVariables.filter((key) => !process.env[key]?.trim())
  if (missing.length)
    throw new Error(`[telegram] Missing production variables: ${missing.join(", ")}`)

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(secret))
    throw new Error("[telegram] TELEGRAM_WEBHOOK_SECRET must be 16–256 URL-safe characters")

  let origin
  try {
    origin = new URL(process.env.URL)
  } catch {
    throw new Error("[telegram] Netlify URL must be a public HTTPS origin")
  }
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/" ||
    !["", "443", "80", "88", "8443"].includes(origin.port)
  )
    throw new Error("[telegram] Netlify URL must be an HTTPS origin on a supported webhook port")
  return origin.origin
}

/** Check configuration before publishing a production deploy with a partial bot setup. */
export function onPreBuild({ constants }) {
  if (hostedProduction(constants)) configuredOrigin()
}

/**
 * Netlify secrets are readable inside hosted builds, so registration happens
 * here after the production endpoint has deployed. A preview must never move
 * the production bot's single webhook to its own URL.
 */
export async function onSuccess({ constants }) {
  if (!hostedProduction(constants)) return
  const origin = configuredOrigin()
  if (!origin) return

  await new Promise((resolve, reject) => {
    execFile(
      "pnpm",
      ["telegram:setup-webhook", origin],
      {
        cwd: appDirectory,
        env: process.env,
        timeout: 60_000,
        maxBuffer: 256 * 1024,
        windowsHide: true,
      },
      (error) => {
        // Child output and Error objects may contain HTTP URLs with the bot
        // token. Do not forward either to the public build log.
        if (error) {
          reject(
            new Error(
              "[telegram] Webhook registration failed. Check the production bot token, username, webhook secret and endpoint; then retry the setup script with production credentials.",
            ),
          )
          return
        }
        resolve()
      },
    )
  })
  console.log(`[telegram] Webhook registered for ${origin}`)
}
