/**
 * Pre-process assistant message text before handing it to `react-markdown`.
 *
 * Responsibilities:
 *   1. Strip model reasoning blocks (`<think>…</think>`), including the
 *      unclosed tail while the response is still streaming — replaced with
 *      a small placeholder so the user knows something was truncated
 *      instead of seeing the entire remainder of the answer vanish.
 *   2. Strip `[cite:…]` markers (any open bracket count — including a
 *      truncated `[cite:som` left dangling at end-of-stream).
 *   3. Turn `[N]` citation markers into proper markdown links pointing at
 *      the matching `CitationRef` URL.
 *   4. Collapse runs of whitespace and trim the leading margin.
 */

import type { CitationRef } from "@/lib/ai/types"

const THINK_PLACEHOLDER = "\n\n_… reasoning hidden …_\n\n"

export interface PreparedAssistantContent {
  /** Text safe to render through `react-markdown`. */
  text: string
  /** True when at least one `<think>` block was truncated. */
  truncatedThink: boolean
}

export function prepareAssistantContent(
  content: string,
  citations?: CitationRef[],
): PreparedAssistantContent {
  let truncatedThink = false
  let out = content

  // 1. Strip closed <think> blocks first. If an open block remains, drop
  //    everything from the marker to end-of-content and leave a placeholder.
  const closed = out.replace(/<think>[\s\S]*?<\/think>/gi, "")
  if (closed !== out) {
    out = closed
  }
  const openIdx = out.search(/<think>/i)
  if (openIdx !== -1) {
    out = `${out.slice(0, openIdx)}${THINK_PLACEHOLDER}`
    truncatedThink = true
  }

  // 2. Strip citation markers — both complete `[cite:…]` and a truncated
  //    `[cite:foo` left dangling at end-of-stream.
  out = out.replace(/\[cite:[^\]]*\]/g, "")
  out = out.replace(/\[cite:[^\]\n]*$/gm, "")

  // 3. Rewrite `[N]` citation markers into markdown links. Supports any
  //    digit count (the previous regex was capped at 2 digits).
  if (citations && citations.length > 0) {
    out = out.replace(/\[(\d+)\](?!\()/g, (match, digits: string) => {
      const citation = citations.find((c) => c.index === Number(digits))
      return citation?.url ? `[${digits}](${citation.url})` : match
    })
  }

  // 4. Collapse stray whitespace and trim the margins.
  out = out.replace(/[ \t]{2,}/g, " ").trim()

  return { text: out, truncatedThink }
}
