import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

export type RateLimitFailMode = "memory" | "closed" | "open"

export type RateLimitWindow = `${number} ${"s" | "m" | "h" | "d"}`

interface RateLimitOptions {
  limit: number
  /** Upstash window syntax, e.g. "10 m", "1 d". */
  window: RateLimitWindow
  /** Behavior when Redis is configured but unreachable. Defaults to "memory". */
  failMode?: RateLimitFailMode
}

const MAX_MEMORY_KEYS = 10_000
const memoryBuckets = new Map<string, number[]>()

function pruneMemoryBuckets(now: number): void {
  if (memoryBuckets.size <= MAX_MEMORY_KEYS) return
  for (const [key, timestamps] of memoryBuckets) {
    const last = timestamps[timestamps.length - 1] ?? 0
    if (last < now - 24 * 60 * 60_000) {
      memoryBuckets.delete(key)
      if (memoryBuckets.size <= MAX_MEMORY_KEYS / 2) break
    }
  }
}

function inMemoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs
  const existing = (memoryBuckets.get(key) ?? []).filter((t) => t > cutoff)
  if (existing.length >= limit) {
    memoryBuckets.set(key, existing)
    pruneMemoryBuckets(now)
    return { success: false, remaining: 0, reset: (existing[0] ?? now) + windowMs }
  }
  existing.push(now)
  memoryBuckets.set(key, existing)
  pruneMemoryBuckets(now)
  return { success: true, remaining: limit - existing.length, reset: now + windowMs }
}

let redisClient: Redis | null | undefined
const upstashLimiters = new Map<string, Ratelimit>()

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient
  const env = getServerEnv()
  redisClient =
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
      : null
  return redisClient
}

function getUpstashLimiter(limit: number, window: RateLimitWindow): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  const cacheKey = `${limit}:${window}`
  let limiter = upstashLimiters.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: "averianlabs:rl",
      analytics: false,
    })
    upstashLimiters.set(cacheKey, limiter)
  }
  return limiter
}

/**
 * Shared rate limiter. Uses Upstash when configured, otherwise an in-memory
 * sliding window (dev / single instance). `failMode` decides what happens when
 * Upstash is configured but the call fails.
 */
export async function rateLimit(
  key: string,
  { limit, window, failMode = "memory" }: RateLimitOptions,
): Promise<RateLimitResult> {
  const windowMs = parseWindowMs(window)
  const limiter = getUpstashLimiter(limit, window)

  if (limiter) {
    try {
      const result = await limiter.limit(key)
      return { success: result.success, remaining: result.remaining, reset: result.reset }
    } catch (err) {
      logger.error("[rate-limit] Upstash unavailable", err)
      if (failMode === "closed")
        return { success: false, remaining: 0, reset: Date.now() + windowMs }
      if (failMode === "open")
        return { success: true, remaining: limit, reset: Date.now() + windowMs }
      return inMemoryLimit(key, limit, windowMs)
    }
  }

  return inMemoryLimit(key, limit, windowMs)
}

function parseWindowMs(window: string): number {
  const [amountRaw, unit] = window.split(" ")
  const amount = Number(amountRaw)
  const multipliers: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }
  return amount * (multipliers[unit ?? "m"] ?? 60_000)
}
