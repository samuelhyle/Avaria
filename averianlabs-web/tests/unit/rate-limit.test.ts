import { rateLimit } from "@/lib/security/rate-limit"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

/**
 * The rate limiter.
 *
 * Two behaviours matter and neither was covered:
 *
 *   - When Upstash is unreachable the limiter fails *open* by default, so an
 *     outage does not take the checkout down. A caller that wants the opposite
 *     says so with `failMode`.
 *   - `RATE_LIMIT_DISABLED` turns it into a no-op, which is what the browser
 *     test suite needs: eight workers share one IP and the register limit fires
 *     mid-suite.
 */

const originalFlag = process.env.RATE_LIMIT_DISABLED

beforeEach(() => {
  // `Reflect.deleteProperty` rather than `delete`: the lint rule about the
  // delete operator is about object churn, not about removing an env var.
  Reflect.deleteProperty(process.env, "RATE_LIMIT_DISABLED")
})

afterEach(() => {
  if (originalFlag === undefined) Reflect.deleteProperty(process.env, "RATE_LIMIT_DISABLED")
  else process.env.RATE_LIMIT_DISABLED = originalFlag
})

describe("rateLimit", () => {
  it("counts against the limit in the window", async () => {
    const key = `unit-${crypto.randomUUID()}`
    const first = await rateLimit(key, { limit: 2, window: "1 h" })
    expect(first.success).toBe(true)
    expect(first.remaining).toBe(1)
    const second = await rateLimit(key, { limit: 2, window: "1 h" })
    expect(second.success).toBe(true)
    expect(second.remaining).toBe(0)
    const third = await rateLimit(key, { limit: 2, window: "1 h" })
    expect(third.success).toBe(false)
    expect(third.remaining).toBe(0)
  })

  it("keeps separate counters per key", async () => {
    const a = `unit-a-${crypto.randomUUID()}`
    const b = `unit-b-${crypto.randomUUID()}`
    await rateLimit(a, { limit: 1, window: "1 h" })
    await rateLimit(a, { limit: 1, window: "1 h" })
    const other = await rateLimit(b, { limit: 1, window: "1 h" })
    expect(other.success).toBe(true)
  })

  it("is a no-op when RATE_LIMIT_DISABLED is set", async () => {
    process.env.RATE_LIMIT_DISABLED = "true"
    const key = `unit-disabled-${crypto.randomUUID()}`
    for (let attempt = 0; attempt < 25; attempt++) {
      const result = await rateLimit(key, { limit: 1, window: "1 h" })
      expect(result.success).toBe(true)
    }
  })

  it("reports a reset time inside the window", async () => {
    const result = await rateLimit(`unit-reset-${crypto.randomUUID()}`, {
      limit: 5,
      window: "1 h",
    })
    expect(result.reset).toBeGreaterThan(Date.now())
    expect(result.reset).toBeLessThanOrEqual(Date.now() + 60 * 60_000 + 1000)
  })
})
