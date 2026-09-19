/**
 * MiniMax provider for the Averia chat concierge.
 *
 * Talks to MiniMax's OpenAI-compatible chat-completions endpoint directly
 * via fetch (rather than the Vercel AI SDK) to keep dependencies minimal
 * and to leave room for a non-OpenAI-compatible endpoint later.
 *
 * Embedding calls transparently fall back to `localEmbeddings` when MiniMax
 * returns its 1-RPM rate limit (status_code 1002). The fallback path runs
 * `Xenova/all-MiniLM-L6-v2` locally via ONNX runtime — see
 * `local-embeddings.ts` for the model details and dimensions.
 */

import { localEmbedText, localEmbedTexts } from "@/lib/ai/providers/local-embeddings"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"

export interface MinimaxConfig {
  apiKey: string
  baseURL: string
  chatModel: string
  embeddingModel: string
  embeddingDimensions?: number
}

export type ChatMessagePayload =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCallPayload[] }
  | { role: "tool"; tool_call_id: string; content: string }

export interface ToolCallPayload {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export interface ChatToolDefinition {
  type: "function"
  function: {
    name: string
    description: string
    parameters: { type: "object"; properties: Record<string, unknown>; required: string[] }
  }
}

export interface MinimaxChatRequest {
  model: string
  messages: ChatMessagePayload[]
  temperature?: number
  max_tokens?: number
  stream: true
  tools?: ChatToolDefinition[]
  tool_choice?: "auto" | "none"
}

export interface ChatCompletionChunk {
  delta: {
    content?: string
    tool_calls?: Array<{
      index: number
      id?: string
      type?: "function"
      function?: { name?: string; arguments?: string }
    }>
  }
  finish_reason?: string
}

export function getMinimaxConfig(): MinimaxConfig {
  const e = getServerEnv()
  const apiKey = e.MINIMAX_API_KEY ?? ""
  const baseURL = (e.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1").replace(/\/$/, "")
  const chatModel = e.MINIMAX_CHAT_MODEL ?? "MiniMax-M3"
  const embeddingModel = e.MINIMAX_EMBEDDING_MODEL ?? "text-embedding-MiniMax-M3"

  const dimRaw = e.MINIMAX_EMBEDDING_DIMENSIONS
  const embeddingDimensions = dimRaw ? Number.parseInt(dimRaw, 10) : undefined

  return {
    apiKey,
    baseURL,
    chatModel,
    embeddingModel,
    embeddingDimensions: Number.isFinite(embeddingDimensions) ? embeddingDimensions : undefined,
  }
}

export function isMinimaxConfigured(): boolean {
  const key = getServerEnv().MINIMAX_API_KEY
  return Boolean(key && key.length > 0)
}

/**
 * Streams a chat completion from MiniMax. Yields parsed `ChatCompletionChunk`
 * objects so the caller can handle text deltas and tool-call deltas uniformly.
 *
 * Throws on non-2xx responses. Retries transient errors (429, 5xx, network)
 * up to `maxRetries` times with exponential backoff before giving up.
 */
export async function* streamMinimaxChat(input: {
  messages: ChatMessagePayload[]
  temperature?: number
  maxTokens?: number
  tools?: ChatToolDefinition[]
  signal?: AbortSignal
  /** Override retry budget (default 2 = one retry after the first failure). */
  maxRetries?: number
}): AsyncGenerator<ChatCompletionChunk, void, void> {
  const cfg = getMinimaxConfig()
  const body: MinimaxChatRequest = {
    model: cfg.chatModel,
    messages: input.messages,
    temperature: input.temperature ?? 0.4,
    // Long enough for comparison tables (800 truncated them mid-answer).
    max_tokens: input.maxTokens ?? 1500,
    stream: true,
    ...(input.tools ? { tools: input.tools, tool_choice: "auto" as const } : {}),
  }

  // 60s streaming ceiling per chat turn. Tool-use + 1500-token streaming
  // responses legitimately take longer than 15s. Merged with the caller's
  // signal so the browser's stop button still works.
  const maxRetries = input.maxRetries ?? 2
  let attempt = 0

  while (true) {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(new Error("MiniMax request timed out")),
      60_000,
    )
    const onAbort = () => controller.abort()
    input.signal?.addEventListener("abort", onAbort, { once: true })

    try {
      const res = await fetch(`${cfg.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "")
        const transient = res.status === 429 || res.status >= 500
        if (transient && attempt < maxRetries) {
          attempt++
          await backoff(attempt, input.signal)
          continue
        }
        throw new Error(`MiniMax chat failed: ${res.status} ${text.slice(0, 200)}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // SSE events are separated by blank lines (\n\n). MiniMax follows the
        // standard, so we split on the boundary — but be defensive against a
        // CRLF-terminating proxy by checking both shapes.
        let nlIdx = buffer.indexOf("\n\n")
        if (nlIdx === -1) nlIdx = buffer.indexOf("\r\n\r\n")
        let advance = nlIdx === -1 ? 0 : buffer.charCodeAt(nlIdx) === 13 ? 4 : 2
        while (nlIdx !== -1) {
          const event = buffer.slice(0, nlIdx)
          buffer = buffer.slice(nlIdx + advance)
          let sawDone = false
          for (const line of event.split("\n")) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data:")) continue
            const payload = trimmed.slice(5).trim()
            if (payload === "[DONE]") {
              sawDone = true
              break
            }
            if (!payload) continue
            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: ChatCompletionChunk["delta"]; finish_reason?: string }>
              }
              const choice = json.choices?.[0]
              if (!choice) continue
              yield { delta: choice.delta ?? {}, finish_reason: choice.finish_reason }
            } catch {
              // Skip malformed lines.
            }
          }
          if (sawDone) return
          nlIdx = buffer.indexOf("\n\n")
          if (nlIdx === -1) nlIdx = buffer.indexOf("\r\n\r\n")
          advance = nlIdx === -1 ? 0 : buffer.charCodeAt(nlIdx) === 13 ? 4 : 2
        }
      }
      return
    } catch (err) {
      const aborted = input.signal?.aborted || controller.signal.aborted
      if (aborted) throw err
      const transient = isTransientNetworkError(err)
      if (transient && attempt < maxRetries) {
        attempt++
        await backoff(attempt, input.signal)
        continue
      }
      throw err
    } finally {
      clearTimeout(timeout)
      input.signal?.removeEventListener("abort", onAbort)
    }
  }
}

function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("aborted") // fetch-level abort before we got headers
  )
}

function backoff(attempt: number, signal?: AbortSignal): Promise<void> {
  const ms = Math.min(1000 * 2 ** (attempt - 1), 4000)
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t)
        resolve()
      },
      { once: true },
    )
  })
}

/**
 * Single-shot (non-streaming) completion — used by the community moderator.
 * Shares the timeout + auth handling with the streaming path.
 * Includes retry logic for transient errors (429, 5xx, network).
 */
export async function completeMinimaxChat(input: {
  messages: ChatMessagePayload[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  /** Override retry budget (default 2 = one retry after the first failure). */
  maxRetries?: number
}): Promise<string> {
  const cfg = getMinimaxConfig()
  if (!cfg.apiKey) throw new Error("MiniMax is not configured")

  const maxRetries = input.maxRetries ?? 2
  let attempt = 0

  while (true) {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(new Error("MiniMax request timed out")),
      15_000,
    )
    const onAbort = () => controller.abort()
    input.signal?.addEventListener("abort", onAbort, { once: true })

    try {
      const res = await fetch(`${cfg.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.chatModel,
          messages: input.messages,
          temperature: input.temperature ?? 0.2,
          max_tokens: input.maxTokens ?? 512,
          stream: false,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        const transient = res.status === 429 || res.status >= 500
        if (transient && attempt < maxRetries) {
          attempt++
          await backoff(attempt, input.signal)
          continue
        }
        throw new Error(`MiniMax completion failed: ${res.status} ${text.slice(0, 200)}`)
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      return json.choices?.[0]?.message?.content ?? ""
    } catch (err) {
      const aborted = input.signal?.aborted || controller.signal.aborted
      if (aborted) throw err
      const transient = isTransientNetworkError(err)
      if (transient && attempt < maxRetries) {
        attempt++
        await backoff(attempt, input.signal)
        continue
      }
      throw err
    } finally {
      clearTimeout(timeout)
      input.signal?.removeEventListener("abort", onAbort)
    }
  }
}

/**
 * Batched embeddings call — one request for many texts (MiniMax accepts
 * `texts: string[]`). This turns a 1 RPM limit into one request per batch
 * instead of one per chunk. Returns `null` when MiniMax isn't configured.
 *
 * Auto-falls back to the local embedder (`localEmbedTexts`) when MiniMax
 * returns HTTP 200 with `base_resp.status_code 1002 (RPM exceeded)`. After
 * one failure we back off for `RATE_LIMIT_COOLDOWN_MS` so we don't keep
 * hammering a quota that won't reset.
 *
 * Return shape matches `localEmbedTexts`: each input yields either a
 * `number[]` vector or `null` (failure). Indexers can skip the nulls.
 */
export async function embedTexts(inputs: string[]): Promise<Array<number[] | null> | null> {
  const cfg = getMinimaxConfig()
  if (!cfg.apiKey) return null
  if (inputs.length === 0) return []

  if (embedRateLimitedUntil > Date.now()) {
    return localEmbedTexts(inputs)
  }

  const res = await fetch(`${cfg.baseURL}/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.embeddingModel,
      texts: inputs,
      type: "db",
      ...(cfg.embeddingDimensions ? { dimensions: cfg.embeddingDimensions } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`MiniMax embeddings failed: ${res.status} ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as {
    vectors?: number[][] | null
    data?: Array<{ embedding: number[] }>
    base_resp?: { status_code?: number; status_msg?: string }
  }
  // Rate-limit cooldown — switch to the local fallback for the next window.
  if (json.base_resp?.status_code === 1002) {
    logger.warn(
      `[embedTexts] MiniMax embeddings rate limit hit (1002) — backing off for ${RATE_LIMIT_COOLDOWN_MS / 1000}s, switching to local fallback`,
    )
    embedRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
    return localEmbedTexts(inputs)
  }
  if (Array.isArray(json.vectors) && json.vectors.length >= inputs.length) {
    return json.vectors.slice(0, inputs.length).map((v) => v ?? null)
  }
  if (Array.isArray(json.data) && json.data.length >= inputs.length) {
    return json.data.slice(0, inputs.length).map((d) => d.embedding ?? null)
  }
  throwEmbeddingError(json.base_resp)
}

/**
 * Single-shot embeddings call. Returns the embedding vector, or `null` when
 * MiniMax isn't configured. Falls back to the local embedder on RPM rate
 * limit. Throws on other API/network failure so callers can tell "not
 * configured" apart from "failed" (the indexer must not silently write
 * NULL embeddings).
 */
export async function embedText(input: string): Promise<number[] | null> {
  const cfg = getMinimaxConfig()
  if (!cfg.apiKey) return null

  if (embedRateLimitedUntil > Date.now()) {
    return localEmbedText(input)
  }

  const res = await fetch(`${cfg.baseURL}/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.embeddingModel,
      texts: [input],
      type: "query",
      ...(cfg.embeddingDimensions ? { dimensions: cfg.embeddingDimensions } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`MiniMax embeddings failed: ${res.status} ${body.slice(0, 200)}`)
  }
  // MiniMax returns { vectors: number[][] | null, base_resp: {...} }.
  const json = (await res.json()) as {
    vectors?: number[][] | null
    data?: Array<{ embedding: number[] }>
    base_resp?: { status_code?: number; status_msg?: string }
  }
  if (json.base_resp?.status_code === 1002) {
    logger.warn(
      `[embedText] MiniMax embeddings rate limit hit (1002) — backing off for ${RATE_LIMIT_COOLDOWN_MS / 1000}s, switching to local fallback`,
    )
    embedRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
    return localEmbedText(input)
  }
  if (Array.isArray(json.vectors) && json.vectors[0]) return json.vectors[0]
  if (Array.isArray(json.data) && json.data[0]) return json.data[0].embedding
  throwEmbeddingError(json.base_resp)
}

/**
 * How long to skip the MiniMax endpoint after a rate-limit hit before
 * probing it again. The MiniMax limit is documented as 1 RPM, so we err on
 * the conservative side and retry every 5 minutes.
 */
const RATE_LIMIT_COOLDOWN_MS = 5 * 60_000

/**
 * Module-level cooldown timestamp (epoch ms). While `Date.now() < this`,
 * `embedText`/`embedTexts` short-circuit straight to the local fallback
 * instead of hammering MiniMax.
 */
let embedRateLimitedUntil = 0

/** Test/debug helper: force-clear the rate-limit cooldown. */
export function _resetEmbedCooldown(): void {
  embedRateLimitedUntil = 0
}

/** Test/debug helper: peek at the current cooldown deadline. */
export function _embedCooldownDeadline(): number {
  return embedRateLimitedUntil
}

/**
 * MiniMax returns HTTP 200 with `vectors: null` and a `base_resp` error code.
 * 1002 = rate limit (RPM) — surfaced distinctly so callers can back off.
 */
function throwEmbeddingError(baseResp?: { status_code?: number; status_msg?: string }): never {
  const code = baseResp?.status_code
  const msg = baseResp?.status_msg ?? "unknown error"
  if (code === 1002) {
    throw new Error(`MiniMax embeddings rate limit (RPM) exceeded: ${msg}`)
  }
  throw new Error(`MiniMax embeddings error${code ? ` (${code})` : ""}: ${msg}`)
}
