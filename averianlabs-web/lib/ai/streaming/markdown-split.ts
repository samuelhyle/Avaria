/**
 * Streaming-aware markdown split.
 *
 * While the model is still emitting tokens, the assistant bubble flickers
 * because every chunk re-parses the entire accumulated content through
 * `react-markdown`. A partial table row suddenly becomes a `<table>`, a
 * half-typed code fence becomes a `<pre>`, and the bubble height jumps.
 *
 * To prevent that, we split the in-flight content into:
 *   - `committed`: a prefix where every block (paragraph, table, fenced
 *     code block, list) is fully closed. Safe to render through
 *     `react-markdown` once and re-render only when it grows.
 *   - `trailing`: the in-flight tail. Rendered as plain text with
 *     `whitespace-pre-wrap` so it streams smoothly without DOM mutation.
 *
 * The split point is the last double-newline that lives OUTSIDE of a
 * fenced code block. Anything after that is "still being typed".
 */

export interface SplitMarkdown {
  committed: string
  trailing: string
}

export function splitMarkdownForStreaming(content: string): SplitMarkdown {
  if (!content) return { committed: "", trailing: "" }

  let inFence = false
  let lastSafeIndex = -1

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    const atLineStart = i === 0 || content[i - 1] === "\n"

    // Toggle fenced code block at start-of-line triple-backtick.
    if (atLineStart && content.startsWith("```", i)) {
      inFence = !inFence
      i += 2 // skip the next two backticks
      continue
    }

    if (!inFence && ch === "\n" && content[i + 1] === "\n") {
      lastSafeIndex = i + 1 // include the second newline
    }
  }

  // No safe split → render everything as trailing plain text. (This is the
  // steady state during the first sentence of a reply.)
  if (lastSafeIndex === -1) {
    return { committed: "", trailing: content }
  }

  const trailing = content.slice(lastSafeIndex + 1)
  // If the trailing slice is only whitespace (e.g. the model just typed a
  // closing `\n\n`), promote it into the committed bucket so ReactMarkdown
  // sees the final paragraph break.
  if (trailing.trim() === "") {
    return { committed: content, trailing: "" }
  }

  return {
    committed: content.slice(0, lastSafeIndex + 1),
    trailing,
  }
}
