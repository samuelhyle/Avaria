import { z } from "zod"

// `next build` evaluates server modules before the runtime env is injected
// (e.g. the Docker builder only passes a placeholder DATABASE_URL). Relax the
// production-only requirements during the build phase; runtime still enforces.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
const isProduction = process.env.NODE_ENV === "production" && !isBuildPhase

// The static Netlify demo build (BUILD_MODE=demo) skips every external
// integration, so the env validator must accept an entirely empty config.
const isDemoBuild = process.env.BUILD_MODE === "demo"

const emptyToUndefined = (env: unknown): Record<string, unknown> => {
  const source = (env ?? {}) as Record<string, string | undefined>
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    out[key] = typeof value === "string" && value.trim() === "" ? undefined : value
  }
  return out
}

const requiredInProduction = (schema: z.ZodString) =>
  isProduction && !isDemoBuild ? schema : schema.optional()

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: requiredInProduction(z.string().min(1, "DATABASE_URL is required in production")),

  AUTH_SECRET: requiredInProduction(
    z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  ),
  // Required in production so Auth.js derives canonical URLs from it rather
  // than from client-supplied Host headers.
  AUTH_URL: requiredInProduction(
    z.string().url("AUTH_URL must be a valid URL, e.g. https://averianlabs.eu"),
  ),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),

  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters").optional(),

  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  COINBASE_COMMERCE_API_KEY: z.string().min(1).optional(),
  COINBASE_COMMERCE_WEBHOOK_SECRET: z.string().min(1).optional(),

  SENDCLOUD_PUBLIC_KEY: z.string().min(1).optional(),
  SENDCLOUD_SECRET_KEY: z.string().min(1).optional(),
  SENDCLOUD_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Telegram — crypto checkout. All optional so the site builds and runs
  // without the bot; the crypto route reports "not configured" instead.
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  /**
   * The secret Telegram sends in `X-Telegram-Bot-Api-Secret-Token`.
   *
   * Telegram only accepts 1–256 characters from `A-Z`, `a-z`, `0-9`, `_` and
   * `-`, and refuses the whole `setWebhook` call otherwise. The constraint is
   * checked here so a bad value fails at boot rather than at the first
   * webhook delivery.
   */
  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .min(16)
    .max(256)
    .regex(/^[A-Za-z0-9_-]+$/, "TELEGRAM_WEBHOOK_SECRET may only contain A-Z, a-z, 0-9, _ and -")
    .optional(),
  /** Shared secret for bot -> site service calls. */
  TELEGRAM_INTERNAL_SECRET: z.string().min(16).optional(),
  /** The team's chat that receives every order notification. */
  TELEGRAM_OPS_CHAT_ID: z.string().min(1).optional(),
  /** The public @username of the bot, used to build the t.me deep link. */
  TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),

  // Crypto — receiving wallet and rate source.
  CRYPTO_WALLET_ADDRESS: z.string().min(1).optional(),
  /** Comma-separated per-chain overrides, e.g. "btc=bc1...,usdt_trc20=T...". */
  CRYPTO_WALLET_ADDRESSES: z.string().min(1).optional(),
  CHECKOUT_TEST_PRODUCT_ENABLED: z.enum(["true", "false"]).default("false"),
  CRYPTO_ENABLED_CHAINS: z.string().min(1).optional(),
  /** Public price API used to lock the EUR rate when an invoice is issued. */
  CRYPTO_RATE_API_URL: z.string().url().optional(),
  /** Fallback rate when the API is unreachable: "btc=60000,usdt_trc20=0.92". */
  CRYPTO_FALLBACK_RATES: z.string().min(1).optional(),
  /**
   * Explorer keys for the deposit watcher.
   *
   * Bitcoin needs none. Without the key for a chain the watcher reports
   * `explorer_not_configured` for it and skips it, so the other chains keep
   * working.
   */
  ETHERSCAN_API_KEY: z.string().min(1).optional(),
  TRONGRID_API_KEY: z.string().min(1).optional(),
  /** Mainnet RPC endpoint used to verify finalized native USDC deposits on Solana. */
  SOLANA_RPC_URL: z
    .string()
    .url()
    .refine((value) => new URL(value).protocol === "https:", "SOLANA_RPC_URL must use HTTPS")
    .optional(),

  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),

  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),

  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_SANITY_DATASET: z.string().min(1).optional(),
  SANITY_API_TOKEN: z.string().min(1).optional(),
  SANITY_API_READ_TOKEN: z.string().min(1).optional(),

  MEILI_HOST: z.string().url().optional(),
  MEILI_API_KEY: z.string().min(1).optional(),
  MEILI_MASTER_KEY: z.string().min(1).optional(),
  MEILI_SEARCH_KEY: z.string().min(1).optional(),

  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_R2_BASE_URL: z.string().url().optional(),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  MINIMAX_API_KEY: z.string().min(1).optional(),
  MINIMAX_BASE_URL: z.string().url().optional(),
  MINIMAX_CHAT_MODEL: z.string().min(1).optional(),
  MINIMAX_EMBEDDING_MODEL: z.string().min(1).optional(),
  MINIMAX_EMBEDDING_DIMENSIONS: z.string().optional(),

  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  VERCEL_URL: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cached) return cached
  const parsed = serverSchema.safeParse(emptyToUndefined(process.env))
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n")
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  cached = parsed.data
  return cached
}

/** Reset the memoized env — test-only. */
export function resetServerEnvCache(): void {
  cached = null
}
