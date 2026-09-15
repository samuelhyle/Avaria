/**
 * MiniMax provider for the Averia chat concierge.
 *
 * Talks to MiniMax's OpenAI-compatible chat-completions endpoint directly
 * via fetch (rather than the Vercel AI SDK) to keep dependencies minimal
 * and to leave room for a non-OpenAI-compatible endpoint later.
 */

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
  const apiKey = process.env.MINIMAX_API_KEY ?? ""
  const baseURL = (process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1").replace(/\/$/, "")
  const chatModel = process.env.MINIMAX_CHAT_MODEL ?? "MiniMax-M3"
  const embeddingModel = process.env.MINIMAX_EMBEDDING_MODEL ?? "text-embedding-MiniMax-M3"

  const dimRaw = process.env.MINIMAX_EMBEDDING_DIMENSIONS
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
  return Boolean(process.env.MINIMAX_API_KEY && process.env.MINIMAX_API_KEY.length > 0)
}

/**
 * Streams a chat completion from MiniMax. Yields parsed `ChatCompletionChunk`
 * objects so the caller can handle text deltas and tool-call deltas uniformly.
 *
 * Throws on non-2xx responses.
 */
export async function* streamMinimaxChat(input: {
  messages: ChatMessagePayload[]
  temperature?: number
  maxTokens?: number
  tools?: ChatToolDefinition[]
  signal?: AbortSignal
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

  // 15s streaming ceiling per the AI plan, merged with the caller's signal.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error("MiniMax request timed out")), 15_000)
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
      // standard, so we split on the boundary.
      let nlIdx = buffer.indexOf("\n\n")
      while (nlIdx !== -1) {
        const event = buffer.slice(0, nlIdx)
        buffer = buffer.slice(nlIdx + 2)
        for (const line of event.split("\n")) {
          const trimmed = line.trim()
          if (!trimmed.startsWith("data:")) continue
          const payload = trimmed.slice(5).trim()
          if (payload === "[DONE]") return
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
        nlIdx = buffer.indexOf("\n\n")
      }
    }
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener("abort", onAbort)
  }
}

/**
 * Single-shot (non-streaming) completion — used by the community moderator.
 * Shares the timeout + auth handling with the streaming path.
 */
export async function completeMinimaxChat(input: {
  messages: ChatMessagePayload[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}): Promise<string> {
  const cfg = getMinimaxConfig()
  if (!cfg.apiKey) throw new Error("MiniMax is not configured")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error("MiniMax request timed out")), 15_000)
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
      throw new Error(`MiniMax completion failed: ${res.status} ${text.slice(0, 200)}`)
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return json.choices?.[0]?.message?.content ?? ""
  } finally {
    clearTimeout(timeout)
    input.signal?.removeEventListener("abort", onAbort)
  }
}

/**
 * Batched embeddings call — one request for many texts (MiniMax accepts
 * `texts: string[]`). This turns a 1 RPM limit into one request per batch
 * instead of one per chunk. Returns `null` when MiniMax isn't configured.
 */
export async function embedTexts(inputs: string[]): Promise<number[][] | null> {
  const cfg = getMinimaxConfig()
  if (!cfg.apiKey) return null
  if (inputs.length === 0) return []

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
  if (Array.isArray(json.vectors) && json.vectors.length >= inputs.length) {
    return json.vectors.slice(0, inputs.length)
  }
  if (Array.isArray(json.data) && json.data.length >= inputs.length) {
    return json.data.slice(0, inputs.length).map((d) => d.embedding)
  }
  throwEmbeddingError(json.base_resp)
}

/**
 * Single-shot embeddings call. Returns the embedding vector, or `null` when
 * MiniMax isn't configured. Throws on API/network failure so callers can tell
 * "not configured" apart from "failed" (the indexer must not silently write
 * NULL embeddings).
 */
export async function embedText(input: string): Promise<number[] | null> {
  const cfg = getMinimaxConfig()
  if (!cfg.apiKey) return null

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
  if (Array.isArray(json.vectors) && json.vectors[0]) return json.vectors[0]
  if (Array.isArray(json.data) && json.data[0]) return json.data[0].embedding
  throwEmbeddingError(json.base_resp)
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
