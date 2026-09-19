import { z } from "zod"

const emptyToUndefined = (env: unknown): Record<string, unknown> => {
  const source = (env ?? {}) as Record<string, string | undefined>
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    out[key] = typeof value === "string" && value.trim() === "" ? undefined : value
  }
  return out
}

/**
 * Fields that should never bring the app down — a single typo should not
 * crash every route handler. When these fields fail to parse, the env
 * loader logs + retries with the bad value dropped to `undefined`, so the
 * feature silently offlines instead of the whole app going 500.
 *
 * Anything NOT here (e.g. NODE_ENV, AUTH_SECRET) still throws on bad input
 * — auth secret length is a hard deploy safety check.
 */
const SOFT_FAIL_FIELDS = new Set([
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "AUTH_URL",
  "MEILI_HOST",
  "R2_PUBLIC_URL",
  "R2_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_R2_BASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "MINIMAX_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_POSTHOG_HOST",
])

/**
 * Coerce a string to `undefined` if it isn't a valid URL.
 *
 * Env-var typos are an extremely common deploy bug — a single broken
 * `SENTRY_DSN=foo` would otherwise crash the whole app at first request
 * because the schema's `.url()` validator throws and every module that
 * touches `getServerEnv()` shares the cached parse. Accepting "looks like
 * garbage" as undefined lets the app come up degraded (the broken feature
 * silently offlines) rather than dead.
 */
const optionalUrl = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) return undefined
    try {
      return new URL(value).toString() ? value : undefined
    } catch {
      return undefined
    }
  })

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // The schema treats these as plain strings — too-short / malformed values
  // are downgraded to `undefined` by the retry path below. Callers
  // (`isAuthConfigured`, `isDatabaseConfigured`) already gate features on
  // presence + length, so an undersized secret simply disables the
  // corresponding feature rather than crashing the whole app.
  AUTH_SECRET: z.string().optional(),
  AUTH_URL: optionalUrl,

  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),

  DATABASE_URL: z.string().min(1).optional(),

  CRON_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  COINBASE_COMMERCE_API_KEY: z.string().min(1).optional(),
  COINBASE_COMMERCE_WEBHOOK_SECRET: z.string().min(1).optional(),

  SENDCLOUD_PUBLIC_KEY: z.string().min(1).optional(),
  SENDCLOUD_SECRET_KEY: z.string().min(1).optional(),
  SENDCLOUD_WEBHOOK_SECRET: z.string().min(1).optional(),

  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),

  SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  SENTRY_ORG: z.string().min(1).optional(),
  SENTRY_PROJECT: z.string().min(1).optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),

  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_SANITY_DATASET: z.string().min(1).optional(),
  SANITY_API_TOKEN: z.string().min(1).optional(),
  SANITY_API_READ_TOKEN: z.string().min(1).optional(),

  MEILI_HOST: optionalUrl,
  MEILI_API_KEY: z.string().min(1).optional(),
  MEILI_MASTER_KEY: z.string().min(1).optional(),
  MEILI_SEARCH_KEY: z.string().min(1).optional(),

  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
  R2_PUBLIC_URL: optionalUrl,
  R2_PUBLIC_BASE_URL: optionalUrl,
  NEXT_PUBLIC_R2_BASE_URL: optionalUrl,

  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  MINIMAX_API_KEY: z.string().min(1).optional(),
  MINIMAX_BASE_URL: optionalUrl,
  MINIMAX_CHAT_MODEL: z.string().min(1).optional(),
  MINIMAX_EMBEDDING_MODEL: z.string().min(1).optional(),
  MINIMAX_EMBEDDING_DIMENSIONS: z.string().optional(),

  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,

  VERCEL_URL: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cached) return cached
  const sanitized = emptyToUndefined(process.env)
  const parsed = serverSchema.safeParse(sanitized)
  if (parsed.success) {
    cached = parsed.data
    return cached
  }

  // Log loudly so the broken variable shows up in Netlify's function log
  // — without this, a bad SENTRY_DSN would only surface as "Invalid
  // environment configuration" with no field name.
  console.error(
    `[env] invalid configuration:\n${parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n")}`,
  )

  // Try once more, but ONLY drop the soft-fail fields. Hard-fail fields
  // (NODE_ENV enum, etc.) still bubble up so the deploy never ships with
  // a broken environment config — only the soft-fail fields are downgraded
  // to undefined, so a typo in SENTRY_DSN can't take down every route.
  const retrySource: Record<string, unknown> = { ...sanitized }
  for (const issue of parsed.error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && SOFT_FAIL_FIELDS.has(key)) {
      retrySource[key] = undefined
    }
  }
  const retry = serverSchema.safeParse(retrySource)
  if (retry.success) {
    cached = retry.data
    return cached
  }
  throw new Error(
    `Invalid environment configuration:\n${parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n")}`,
  )
}

/** Reset the memoized env — test-only. */
export function resetServerEnvCache(): void {
  cached = null
}
