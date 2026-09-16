/**
 * Server-Sent Events (SSE) parser for the Averia chat wire protocol.
 *
 * The chat endpoint frames events as `data: <json>\n\n`, where the JSON
 * payload matches the `AgentEvent` discriminated union. This helper turns a
 * `ReadableStream<Uint8Array>` into an async iterable of `AgentEvent`s,
 * keeping the network buffering / decoding concerns separate from the
 * consumer state machine.
 *
 * Behaviour notes:
 *   - Lines that don't start with `data:` are silently ignored (allows the
 *     server to send `event:`, `id:`, retry hints, etc. without breaking us).
 *   - Empty data payloads are skipped.
 *   - Malformed JSON throws `SseParseError`. The caller can decide whether
 *     to bail or surface a generic error to the UI.
 *   - A trailing event without a final `\n\n` is flushed when the stream
 *     closes, so partial chunks don't get lost.
 */

import type { AgentEvent } from "@/lib/ai/types/events"

export class SseParseError extends Error {
  constructor(message: string, public readonly payload: string) {
    super(message)
    this.name = "SseParseError"
  }
}

export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<AgentEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let nl = buffer.indexOf("\n\n")
      while (nl !== -1) {
        const frame = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 2)
        const event = parseFrame(frame)
        if (event) yield event
        nl = buffer.indexOf("\n\n")
      }
    }

    // Flush any trailing frame that arrived without the closing blank line.
    if (buffer.trim().length > 0) {
      const event = parseFrame(buffer)
      if (event) yield event
    }
  } finally {
    reader.releaseLock()
  }
}

function parseFrame(frame: string): AgentEvent | null {
  const trimmed = frame.trim()
  if (!trimmed.startsWith("data:")) return null
  const payload = trimmed.slice(5).trim()
  if (!payload) return null
  try {
    return JSON.parse(payload) as AgentEvent
  } catch (err) {
    throw new SseParseError(
      `Invalid SSE payload: ${err instanceof Error ? err.message : "unknown"}`,
      payload,
    )
  }
}
