/**
 * Sentence-aware text chunker.
 *
 * Splits a document into chunks of ~`maxTokens` tokens with `overlapTokens`
 * overlap, preserving sentence boundaries where possible. Token counts are
 * approximated as `words * 1.3` (a common rule of thumb for English prose —
 * good enough for budgeting context windows).
 *
 * No external dependencies — we don't pull in a tokenizer at this stage. If
 * we need exact token boundaries later (Phase A6 eval precision), swap in
 * `gpt-tokenizer` or `tiktoken`.
 */

export interface ChunkOptions {
  /** Target chunk size in approximate tokens. Default 800. */
  maxTokens?: number
  /** Overlap between adjacent chunks in tokens. Default 200. */
  overlapTokens?: number
}

export interface Chunk {
  /** 0-indexed position within the source document. */
  position: number
  content: string
  /** Approximate token count. */
  tokenCount: number
}

const DEFAULT_MAX = 800
const DEFAULT_OVERLAP = 200
const APPROX_TOKENS_PER_WORD = 1.3
const MIN_CHARS = 80

function approxTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.ceil(words * APPROX_TOKENS_PER_WORD)
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÅÁÉÍÓÚÑÇ])|(?<=[.!?])\s*$/u)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX
  const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP
  const clean = text.trim()
  if (!clean) return []

  const sentences = splitSentences(clean)
  if (sentences.length === 0) return []

  const chunks: Chunk[] = []
  let buffer: string[] = []
  let bufferTokens = 0

  for (const sentence of sentences) {
    const sentenceTokens = approxTokens(sentence)
    const wouldOverflow = bufferTokens + sentenceTokens > maxTokens && buffer.length > 0

    if (wouldOverflow) {
      const content = buffer.join(" ").trim()
      if (content.length >= MIN_CHARS) {
        chunks.push({
          position: chunks.length,
          content,
          tokenCount: bufferTokens,
        })
      }
      const overlap: string[] = []
      let overlapSum = 0
      for (let i = buffer.length - 1; i >= 0; i--) {
        const t = approxTokens(buffer[i] ?? "")
        if (overlapSum + t > overlapTokens) break
        overlap.unshift(buffer[i] ?? "")
        overlapSum += t
      }
      buffer = overlap
      bufferTokens = overlapSum
    }

    buffer.push(sentence)
    bufferTokens += sentenceTokens
  }

  const tail = buffer.join(" ").trim()
  if (tail.length >= MIN_CHARS) {
    chunks.push({ position: chunks.length, content: tail, tokenCount: bufferTokens })
  }

  return chunks
}
