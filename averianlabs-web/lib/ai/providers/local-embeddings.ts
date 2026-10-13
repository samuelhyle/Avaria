/**
 * Optional local embedding fallback using a quantized ONNX model.
 * The model is downloaded from Hugging Face on first use and cached locally;
 * it is not bundled with the application. Later calls reuse the pipeline.
 * Unavailable model/runtime returns null so retrieval can use lexical search.
 */

import type { FeatureExtractionPipeline } from "@huggingface/transformers"

const MODEL_ID = "Xenova/all-MiniLM-L6-v2"
const EXPECTED_DIM = 384

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
      const p = await pipeline("feature-extraction", MODEL_ID, { dtype: "q8" })
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
