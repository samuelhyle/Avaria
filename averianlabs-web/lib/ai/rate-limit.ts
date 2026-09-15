/**
 * Per-user rate limiting for the chat endpoint.
 *
 * Uses Upstash Redis when configured; falls back to an in-memory sliding-window
 * limiter in development so the chat works locally without Upstash creds.
 *
 * Limits (Phase A0, conservative):
 *   - Anonymous:  20 messages / 10 minutes, 80 / day
 *   - Authenticated: 60 / 10 minutes, 300 / day
 *
 * Both buckets are checked. The first to exceed returns 429.
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export type ChatIdentity = { kind: "anonymous"; ip: string } | { kind: "user"; userId: string }

interface LimitDecision {
  ok: boolean
  remaining: number
  reset: number
  bucket: "short" | "day"
}

interface LimitResult {
  success: boolean
  remaining: number
  reset: number
}

interface CheckableLimiter {
  limit(key: string): Promise<LimitResult>
}

class InMemoryLimiter implements CheckableLimiter {
  private buckets = new Map<string, number[]>()
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  async limit(key: string): Promise<LimitResult> {
    const now = Date.now()
    const cutoff = now - this.windowMs
    const arr = (this.buckets.get(key) ?? []).filter((t) => t > cutoff)
    if (arr.length >= this.max) {
      const oldest = arr[0] ?? now
      return { success: false, remaining: 0, reset: oldest + this.windowMs }
    }
    arr.push(now)
    this.buckets.set(key, arr)
    return { success: true, remaining: this.max - arr.length, reset: now + this.windowMs }
  }
}

interface LimiterPair {
  short: CheckableLimiter
  day: CheckableLimiter
}

interface LimiterSets {
  anon: LimiterPair
  user: LimiterPair
}

let limiter: LimiterSets | null = null

function buildPair(
  prefix: string,
  limits: { shortMax: number; dayMax: number },
  redis: Redis | null,
): LimiterPair {
  if (redis) {
    const short = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limits.shortMax, "10 m"),
      prefix: `${prefix}:short`,
      analytics: false,
    })
    const day = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limits.dayMax, "1 d"),
      prefix: `${prefix}:day`,
      analytics: false,
    })
    return {
      short: short as unknown as CheckableLimiter,
      day: day as unknown as CheckableLimiter,
    }
  }
  return {
    short: new InMemoryLimiter(limits.shortMax, 10 * 60_000),
    day: new InMemoryLimiter(limits.dayMax, 24 * 60 * 60_000),
  }
}

function getLimiter(): LimiterSets {
  if (limiter) return limiter

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  const redis = url && token ? new Redis({ url, token }) : null

  limiter = {
    // Anonymous: 20 / 10 min, 80 / day.
    anon: buildPair("averia:anon", { shortMax: 20, dayMax: 80 }, redis),
    // Authenticated: 60 / 10 min, 300 / day.
    user: buildPair("averia:user", { shortMax: 60, dayMax: 300 }, redis),
  }
  return limiter
}

export async function checkChatRateLimit(identity: ChatIdentity): Promise<LimitDecision> {
  const sets = getLimiter()
  const l = identity.kind === "user" ? sets.user : sets.anon
  const tag = identity.kind === "user" ? identity.userId : identity.ip

  const shortKey = `short:${identity.kind}:${tag}`
  const dayKey = `day:${identity.kind}:${tag}`

  const short = await l.short.limit(shortKey)
  if (!short.success) {
    return { ok: false, remaining: 0, reset: short.reset, bucket: "short" }
  }
  const day = await l.day.limit(dayKey)
  if (!day.success) {
    return { ok: false, remaining: 0, reset: day.reset, bucket: "day" }
  }
  return { ok: true, remaining: short.remaining, reset: short.reset, bucket: "short" }
}
