/**
 * Local embeddings fallback — uses `@huggingface/transformers` (ONNX runtime)
 * to run `Xenova/all-MiniLM-L6-v2` (384-dim) inside Node. No network calls,
 * no GPU, ~23 MB model bundled into node_modules.
 *
 * Why this exists: MiniMax's hosted `/v1/embeddings` endpoint returns HTTP
 * 200 with `base_resp.status_code 1002 (rate limit exceeded)` for this
 * account — the API shape is correct (`texts` + required `type`), but the
 * quota is gone. Rather than block RAG entirely, this module provides a
 * drop-in local embedder. The retrieval layer (RRF) still combines it with
 * BM25, so the agent's answers stay grounded.
 *
 * The model is lazy-loaded on first use (load takes ~9s on a warm cache);
 * subsequent calls share the same pipeline instance.
 */

import type { FeatureExtractionPipeline } from "@huggingface/transformers"

const MODEL_ID = "Xenova/all-MiniLM-L6-v2"
const EXPECTED_DIM = 384
// The model download from the HuggingFace Hub + ONNX warm-up takes ~9s on
// a warm cache and can take much longer in cold environments (e.g. Netlify
// functions without persistent storage, where the first request downloads the
// model). We give the loader a generous budget, then fall back to no-RAG so
// chat requests never hang.
const PIPELINE_LOAD_TIMEOUT_MS = 20_000

interface LocalEmbedderState {
  pipeline: FeatureExtractionPipeline | null
  loading: Promise<FeatureExtractionPipeline> | null
  loadError: Error | null
}

const state: LocalEmbedderState = {
  pipeline: null,
  loading: null,
  loadError: null,
}

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (state.pipeline) return state.pipeline
  if (state.loadError) throw state.loadError
  if (state.loading) return state.loading

  state.loading = (async () => {
    try {
      // Dynamic import keeps the heavy native modules out of the main
      // dependency graph until the first embed call.
      const { pipeline } = await import("@huggingface/transformers")
      // q8 quantization drops the model to ~23 MB and is fast on CPU;
      // quality loss vs. fp32 is negligible for retrieval.
      const loadPromise = pipeline("feature-extraction", MODEL_ID, { dtype: "q8" })
      const timeoutPromise = new Promise<never>((_resolve, reject) =>
        setTimeout(
          () => reject(new Error(`local embedder load timed out after ${PIPELINE_LOAD_TIMEOUT_MS}ms`)),
          PIPELINE_LOAD_TIMEOUT_MS,
        ),
      )
      const p = await Promise.race<FeatureExtractionPipeline>([loadPromise, timeoutPromise])
      state.pipeline = p
      return p
    } catch (err) {
      state.loadError = err instanceof Error ? err : new Error(String(err))
      throw state.loadError
    } finally {
      state.loading = null
    }
  })()

  return state.loading
}

/**
 * Embed a single text. Returns a 384-dim normalised vector, or `null` on
 * failure (matches the existing `embedText` contract).
 */
export async function localEmbedText(input: string): Promise<number[] | null> {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    const pipe = await getPipeline()
    const result = await pipe(trimmed, { pooling: "mean", normalize: true })
    const data = Array.from(result.data as ArrayLike<number>)
    if (data.length !== EXPECTED_DIM) {
      console.warn(`[local-embed] dimension mismatch: got ${data.length}, expected ${EXPECTED_DIM}`)
      return null
    }
    return data
  } catch (err) {
    console.error("[local-embed] single-text embed failed", err)
    return null
  }
}

/**
 * Batched local embedder — matches the `embedTexts` contract used by the
 * indexer. Sequential rather than parallel because the ONNX session is
 * single-threaded; running in parallel just thrashes the runtime.
 *
 * Returns `null` for any individual text that fails; the array length always
 * matches the input length so callers can map results back to inputs.
 */
export async function localEmbedTexts(inputs: string[]): Promise<Array<number[] | null>> {
  if (inputs.length === 0) return []
  try {
    const pipe = await getPipeline()
    const results: Array<number[] | null> = []
    // Sequential to avoid stacking ONNX sessions.
    for (const text of inputs) {
      const trimmed = text.trim()
      if (!trimmed) {
        results.push(null)
        continue
      }
      try {
        const out = await pipe(trimmed, { pooling: "mean", normalize: true })
        const data = Array.from(out.data as ArrayLike<number>)
        results.push(data.length === EXPECTED_DIM ? data : null)
      } catch (err) {
        console.error("[local-embed] chunk failed", err)
        results.push(null)
      }
    }
    return results
  } catch (err) {
    console.error("[local-embed] pipeline unavailable", err)
    return inputs.map(() => null)
  }
}

/** Exposed for diagnostics / health checks. */
export function localEmbedderStatus(): {
  loaded: boolean
  loading: boolean
  error: string | null
  model: string
  dimension: number
} {
  return {
    loaded: state.pipeline !== null,
    loading: state.loading !== null,
    error: state.loadError?.message ?? null,
    model: MODEL_ID,
    dimension: EXPECTED_DIM,
  }
}
