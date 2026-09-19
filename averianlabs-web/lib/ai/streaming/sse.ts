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
 *   - The optional `[DONE]` sentinel (used by some SSE emitters) is dropped.
 *   - Multiple `data:` lines in a single frame are concatenated with `\n`,
 *     per the SSE spec — our server only emits one line per frame, but the
 *     parser handles both shapes so we don't drop legitimate events when the
 *     upstream shape changes.
 *   - Malformed JSON throws `SseParseError`. The caller can decide whether
 *     to bail or surface a generic error to the UI.
 *   - A trailing event without a final `\n\n` is flushed when the stream
 *     closes, so partial chunks don't get lost.
 *   - `\r\n` boundaries (Windows-style line endings) are normalised to `\n`
 *     so a misconfigured proxy doesn't silently swallow our events.
 */

import type { AgentEvent } from "@/lib/ai/types/events"

export class SseParseError extends Error {
  constructor(
    message: string,
    public readonly payload: string,
  ) {
    super(message)
    this.name = "SseParseError"
  }
}

const DONE_SENTINEL = "[DONE]"

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

      // Normalise CRLF → LF before searching so a CRLF proxy doesn't strand
      // the boundary. SSE spec says LF only, but be defensive.
      let nl = buffer.indexOf("\n\n")
      if (nl === -1) nl = buffer.indexOf("\r\n\r\n")
      let advance = nl === -1 ? 0 : buffer.startsWith("\r", nl) ? 4 : 2
      while (nl !== -1) {
        const frame = buffer.slice(0, nl)
        buffer = buffer.slice(nl + advance)
        const event = parseFrame(frame)
        if (event) yield event
        nl = buffer.indexOf("\n\n")
        if (nl === -1) nl = buffer.indexOf("\r\n\r\n")
        advance = nl === -1 ? 0 : buffer.startsWith("\r", nl) ? 4 : 2
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
  // Concatenate multi-line data: blocks per the SSE spec, then check for the
  // [DONE] sentinel some providers send.
  const dataLines: string[] = []
  for (const rawLine of frame.split("\n")) {
    const line = rawLine.trim()
    if (!line.startsWith("data:")) continue
    dataLines.push(line.slice(5).trim())
  }
  if (dataLines.length === 0) return null
  const payload = dataLines.join("\n")
  if (!payload || payload === DONE_SENTINEL) return null
  try {
    return JSON.parse(payload) as AgentEvent
  } catch (err) {
    throw new SseParseError(
      `Invalid SSE payload: ${err instanceof Error ? err.message : "unknown"}`,
      payload,
    )
  }
}
