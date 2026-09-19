/**
 * Embedding helpers.
 *
 * Wraps the provider's batched `embedTexts` so the indexer can chunk → embed →
 * upsert without bursting the upstream rate limit. One request carries a whole
 * batch of chunks; requests are spaced to respect MiniMax's 1 RPM embedding
 * limit.
 *
 * When the provider's rate-limit cooldown is active (i.e. we're using the
 * local fallback), the inter-batch delay is skipped — local inference is
 * CPU-bound and benefits from no pause.
 */

import { _embedCooldownDeadline } from "@/lib/ai/providers/minimax"
import { embedTexts } from "@/lib/ai/providers/minimax"
import { logger } from "@/lib/logger"

export interface BatchOptions {
  /** Texts per request (default 16). */
  batchSize?: number
  /** Sequential delay between requests in ms (default 65000 = 65s for 1 RPM). */
  delayMs?: number
  /** Per-request timeout in ms (default 120_000). */
  timeoutMs?: number
  /** Max retries per request on failure (default 3). */
  maxRetries?: number
  /** Max concurrent requests when local fallback is active (default 3). */
  maxConcurrency?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Simple semaphore for limiting concurrency. Used when local fallback is
 * active to parallelize local ONNX inference across CPU cores.
 */
class Semaphore {
  private permits: number
  private waiters: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  release(): void {
    this.permits++
    const next = this.waiters.shift()
    if (next) {
      this.permits--
      next()
    }
  }
}

export async function embedBatch(
  inputs: string[],
  options: BatchOptions = {},
): Promise<Array<number[] | null>> {
  const batchSize = options.batchSize ?? 16
  const delayMs = options.delayMs ?? 65_000
  const timeoutMs = options.timeoutMs ?? 120_000
  const maxRetries = options.maxRetries ?? 3
  const maxConcurrency = options.maxConcurrency ?? 3
  const results: Array<number[] | null> = new Array(inputs.length).fill(null)

  const totalBatches = Math.ceil(inputs.length / batchSize)
  const useLocalFallback = _embedCooldownDeadline() > Date.now()
  const semaphore = useLocalFallback ? new Semaphore(maxConcurrency) : null

  // Process batches with optional concurrency when using local fallback
  async function processBatch(b: number): Promise<void> {
    const start = b * batchSize
    const slice = inputs.slice(start, start + batchSize)
    let attempt = 0
    let vectors: Array<number[] | null> | null = null
    let lastError: unknown = null

    while (attempt <= maxRetries && (vectors === null || vectors.every((v) => v === null))) {
      try {
        if (semaphore) await semaphore.acquire()
        vectors = await Promise.race([
          embedTexts(slice),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
        ])
        if (vectors === null) lastError = new Error(`embeddings timed out after ${timeoutMs}ms`)
      } catch (err) {
        lastError = err
        vectors = null
      } finally {
        if (semaphore) semaphore.release()
      }
      if ((vectors === null || vectors.every((v) => v === null)) && attempt < maxRetries) {
        // Wait 65s + 5s buffer for the next RPM window before retrying.
        await sleep(65_000)
      }
      attempt++
    }

    if (vectors?.some((v) => v !== null)) {
      for (let i = 0; i < slice.length; i++) {
        results[start + i] = vectors[i] ?? null
      }
      const missing = vectors.filter((v) => v === null).length
      if (missing > 0) {
        logger.warn(
          `[embedBatch] batch ${b + 1}/${totalBatches} — ${missing}/${slice.length} chunks missing embeddings`,
        )
      }
    } else {
      logger.warn(
        `[embedBatch] batch ${b + 1}/${totalBatches} (${slice.length} chunks) failed after ${attempt} attempts:`,
        lastError instanceof Error ? lastError.message : lastError,
      )
    }
  }

  if (useLocalFallback && semaphore) {
    // Parallelize local embedding batches with concurrency limit
    const promises: Promise<void>[] = []
    for (let b = 0; b < totalBatches; b++) {
      promises.push(processBatch(b))
    }
    await Promise.all(promises)
  } else {
    // Sequential with RPM delay for MiniMax API
    for (let b = 0; b < totalBatches; b++) {
      await processBatch(b)
      const done = b === totalBatches - 1
      if (!done) {
        logger.info(
          `[embedBatch] batch ${b + 1}/${totalBatches} done; waiting ${delayMs / 1000}s for RPM window...`,
        )
        await sleep(delayMs)
      }
    }
  }

  return results
}
