/**
 * `getServerEnv` validator — env is the most common source of deploy bugs.
 *
 * The zod schema rejects typos, missing required values, and malformed
 * URLs. These tests pin the contract so a careless schema edit can't
 * silently accept a malformed `DATABASE_URL`.
 */

import { getServerEnv, resetServerEnvCache } from "@/lib/env"
import { afterEach, describe, expect, it } from "vitest"

describe("getServerEnv", () => {
  const saved = { ...process.env }
  function setEnv(key: string, value: string): void {
    // TypeScript marks `process.env.NODE_ENV` as readonly because Node
    // exposes it as a literal. The `delete` / assignment combo below works
    // at runtime — use `Object.defineProperty` to satisfy the compiler.
    Object.defineProperty(process.env, key, {
      configurable: true,
      writable: true,
      enumerable: true,
      value,
    })
  }
  afterEach(() => {
    // Reset env to the original state and bust the cache so each test
    // starts with a clean parse.
    for (const key of Object.keys(process.env)) delete process.env[key]
    for (const [key, value] of Object.entries(saved)) {
      if (value !== undefined) setEnv(key, value)
    }
    resetServerEnvCache()
  })

  it("accepts an empty environment (everything is optional)", () => {
    for (const key of Object.keys(process.env)) delete process.env[key]
    resetServerEnvCache()
    const env = getServerEnv()
    expect(env.NODE_ENV).toBe("development")
  })

  it("coerces empty strings to undefined (skip the .required() rejections)", () => {
    for (const key of Object.keys(process.env)) delete process.env[key]
    setEnv("MINIMAX_API_KEY", "") // empty → undefined
    setEnv("STRIPE_SECRET_KEY", "") // empty → undefined
    resetServerEnvCache()
    const env = getServerEnv()
    expect(env.MINIMAX_API_KEY).toBeUndefined()
    expect(env.STRIPE_SECRET_KEY).toBeUndefined()
  })

  it("rejects NODE_ENV values outside the enum", () => {
    setEnv("NODE_ENV", "production-ish")
    resetServerEnvCache()
    expect(() => getServerEnv()).toThrow(/Invalid environment configuration/)
  })

  it("downgrades malformed soft-fail URLs (Sentry / Meili / R2 / etc.) to undefined", () => {
    setEnv("STRIPE_WEBHOOK_SECRET", "anything")
    setEnv("SENTRY_DSN", "not-a-url")
    setEnv("MEILI_HOST", "also-not-a-url")
    resetServerEnvCache()
    // Soft-fail fields don't crash the app — they offline silently and
    // the broken feature degrades to a no-op.
    const env = getServerEnv()
    expect(env.SENTRY_DSN).toBeUndefined()
    expect(env.MEILI_HOST).toBeUndefined()
    expect(env.STRIPE_WEBHOOK_SECRET).toBe("anything")
  })

  it("downgrades too-short AUTH_SECRET (lets the app boot — `isAuthConfigured` already gates)", () => {
    setEnv("AUTH_SECRET", "short")
    resetServerEnvCache()
    // A short secret passes the env schema (we don't enforce length here
    // so a partial secret doesn't crash the deploy). The 16-char check
    // lives in `isAuthConfigured()` so features fail closed at runtime.
    const env = getServerEnv()
    expect(env.AUTH_SECRET).toBe("short")
  })

  it("accepts a fully configured production-shaped env", () => {
    setEnv("NODE_ENV", "production")
    setEnv("AUTH_SECRET", "a".repeat(32))
    setEnv("AUTH_URL", "https://averianlabs.eu")
    setEnv("DATABASE_URL", "postgres://x:y@db/db")
    setEnv("STRIPE_SECRET_KEY", "sk_test_xxx")
    setEnv("STRIPE_WEBHOOK_SECRET", "whsec_xxx")
    setEnv("MINIMAX_API_KEY", "minimax-xxx")
    setEnv("SENTRY_DSN", "https://key@sentry.io/1")
    setEnv("NEXT_PUBLIC_SITE_URL", "https://averianlabs.eu")
    resetServerEnvCache()
    const env = getServerEnv()
    expect(env.NODE_ENV).toBe("production")
    expect(env.AUTH_URL).toBe("https://averianlabs.eu")
  })

  it("memoizes the result so callers don't pay the parse cost", () => {
    setEnv("MINIMAX_API_KEY", "first")
    resetServerEnvCache()
    const first = getServerEnv()
    setEnv("MINIMAX_API_KEY", "second")
    const cached = getServerEnv()
    expect(cached).toBe(first)
    // After reset, it picks up the new value.
    resetServerEnvCache()
    const fresh = getServerEnv()
    expect(fresh.MINIMAX_API_KEY).toBe("second")
  })
})
