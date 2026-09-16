import { z } from "zod"

// All keys are intentionally optional. Server modules that need a particular
// secret (lib/db.ts for DATABASE_URL, lib/auth/index.ts for AUTH_SECRET/AUTH_URL,
// lib/payments/*, …) read it lazily and fail closed at the call site with a
// readable error. This lets the marketing/catalog/AI-chat site stay live on
// hosts where not every integration is configured (e.g. a Netlify preview
// without Stripe / Sanity / Postgres) instead of crashing the whole server
// bundle at module load.
const emptyToUndefined = (env: unknown): Record<string, unknown> => {
  const source = (env ?? {}) as Record<string, string | undefined>
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    out[key] = typeof value === "string" && value.trim() === "" ? undefined : value
  }
  return out
}

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),

  DATABASE_URL: z.string().min(1).optional(),

  CRON_SECRET: z.string().min(16).optional(),

  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  COINBASE_COMMERCE_API_KEY: z.string().min(1).optional(),
  COINBASE_COMMERCE_WEBHOOK_SECRET: z.string().min(1).optional(),

  SENDCLOUD_PUBLIC_KEY: z.string().min(1).optional(),
  SENDCLOUD_SECRET_KEY: z.string().min(1).optional(),
  SENDCLOUD_WEBHOOK_SECRET: z.string().min(1).optional(),

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
