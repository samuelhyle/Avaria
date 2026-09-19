/**
 * Chat error helpers — pure functions extracted from `use-averia-chat.ts` so
 * they can be unit-tested in isolation.
 *
 * The hook still re-imports these and re-exports the public surface so the
 * pre-extraction call sites continue to work.
 */

/**
 * Map an HTTP failure to a friendly, user-actionable Error. The caller can
 * inspect `e.name` to choose between showing "rate limited", "try again", or
 * "Averia is offline".
 */
export function classifyHttpError(status: number, body: string): Error {
  let code = "unknown"
  try {
    const parsed = JSON.parse(body) as { code?: string; message?: string }
    if (parsed?.code) code = parsed.code
  } catch {
    // Body wasn't JSON — fall through with code "unknown".
  }
  if (status === 429 || code === "rate_limited") {
    const e = new Error(
      "You're sending messages a bit fast. Please slow down and try again in a minute.",
    )
    e.name = "rate_limited"
    return e
  }
  if (status === 503 || code === "provider_unavailable") {
    const e = new Error("Averia is offline right now. Set MINIMAX_API_KEY to enable the chat.")
    e.name = "provider_unavailable"
    return e
  }
  if (status === 400 || code === "invalid_request") {
    const e = new Error(
      "That message couldn't be sent. Try clearing the conversation and sending again.",
    )
    e.name = "invalid_request"
    return e
  }
  if (status >= 500) {
    const e = new Error("Averia hit a server problem. Please try again in a moment.")
    e.name = "server_error"
    return e
  }
  const e = new Error(`Chat failed (${status})`)
  e.name = code
  return e
}

/** Italic placeholder shown when the assistant bubble is empty after an error. */
export function placeholderForError(err: Error): string {
  switch (err.name) {
    case "rate_limited":
      return "_Slow down a touch — Averia's rate limit kicked in. Try again in a minute._"
    case "provider_unavailable":
      return "_Averia is offline. Check that MINIMAX_API_KEY is configured._"
    case "invalid_request":
      return "_That message couldn't be sent. Clear the conversation and try again._"
    case "server_error":
      return "_Averia hit a problem on our side. Try again in a moment._"
    default:
      return "_Averia didn't respond just now. Try again in a moment._"
  }
}
