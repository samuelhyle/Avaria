/**
 * Embedding helpers.
 *
 * Wraps the provider's batched `embedTexts` so the indexer can chunk → embed →
 * upsert without bursting the upstream rate limit. One request carries a whole
 * batch of chunks; requests are spaced to respect MiniMax's 1 RPM embedding
 * limit.
 */

import { embedTexts } from "@/lib/ai/providers/minimax"

export interface BatchOptions {
  /** Texts per request (default 16). */
  batchSize?: number
  /** Sequential delay between requests in ms (default 65000 = 65s for 1 RPM). */
  delayMs?: number
  /** Per-request timeout in ms (default 120_000). */
  timeoutMs?: number
  /** Max retries per request on failure (default 3). */
  maxRetries?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function embedBatch(
  inputs: string[],
  options: BatchOptions = {},
): Promise<Array<number[] | null>> {
  const batchSize = options.batchSize ?? 16
  const delayMs = options.delayMs ?? 65_000
  const timeoutMs = options.timeoutMs ?? 120_000
  const maxRetries = options.maxRetries ?? 3
  const results: Array<number[] | null> = new Array(inputs.length).fill(null)

  const totalBatches = Math.ceil(inputs.length / batchSize)
  for (let b = 0; b < totalBatches; b++) {
    const start = b * batchSize
    const slice = inputs.slice(start, start + batchSize)
    let attempt = 0
    let vectors: Array<number[] | null> | null = null
    let lastError: unknown = null

    while (attempt <= maxRetries && (vectors === null || vectors.every((v) => v === null))) {
      try {
        vectors = await Promise.race([
          embedTexts(slice),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
        ])
        if (vectors === null) lastError = new Error(`embeddings timed out after ${timeoutMs}ms`)
      } catch (err) {
        lastError = err
        vectors = null
      }
      if ((vectors === null || vectors.every((v) => v === null)) && attempt < maxRetries) {
        // Wait 65s + 5s buffer for the next RPM window before retrying.
        await sleep(65_000)
      }
      attempt++
    }

    if (vectors && vectors.some((v) => v !== null)) {
      for (let i = 0; i < slice.length; i++) {
        results[start + i] = vectors[i] ?? null
      }
      const missing = vectors.filter((v) => v === null).length
      if (missing > 0) {
        console.warn(
          `[embedBatch] batch ${b + 1}/${totalBatches} — ${missing}/${slice.length} chunks missing embeddings`,
        )
      }
    } else {
      console.warn(
        `[embedBatch] batch ${b + 1}/${totalBatches} (${slice.length} chunks) failed after ${attempt} attempts:`,
        lastError instanceof Error ? lastError.message : lastError,
      )
    }

    const done = b === totalBatches - 1
    if (!done) {
      console.log(
        `[embedBatch] batch ${b + 1}/${totalBatches} done; waiting ${delayMs / 1000}s for RPM window...`,
      )
      await sleep(delayMs)
    }
  }
  return results
}
