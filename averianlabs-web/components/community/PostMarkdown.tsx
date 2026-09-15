"use client"

import { useTranslations } from "next-intl"

/**
 * Minimal markdown renderer for forum posts.
 *
 * Supports: paragraphs, **bold**, *italic*, `inline code`, ```fenced code```,
 * - bullets, 1. numbered lists, > blockquotes, [text](url) links.
 * Pure-string parsing, no deps. Escapes HTML by default.
 */

interface Token {
  kind: "p" | "ul" | "ol" | "code" | "blockquote"
  text: string
}

function tokenize(body: string): Token[] {
  const lines = body.split(/\n/)
  const out: Token[] = []
  let buf: string[] = []
  let mode: "" | "ul" | "ol" | "code" | "blockquote" = ""

  const flush = () => {
    if (buf.length === 0) return
    out.push({
      kind: mode === "ul" || mode === "ol" || mode === "code" || mode === "blockquote" ? mode : "p",
      text: buf.join(mode === "code" ? "\n" : " "),
    })
    buf = []
  }

  for (const raw of lines) {
    const line = raw
    const trimmed = line.trimEnd()

    if (mode === "code") {
      if (trimmed.startsWith("```")) {
        flush()
        mode = ""
        continue
      }
      buf.push(line)
      continue
    }
    if (trimmed.startsWith("```")) {
      flush()
      mode = "code"
      continue
    }

    if (trimmed.startsWith("> ")) {
      if (mode !== "blockquote") {
        flush()
        mode = "blockquote"
      }
      buf.push(trimmed.slice(2))
      continue
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (mode !== "ul") {
        flush()
        mode = "ul"
      }
      buf.push(trimmed.slice(2))
      continue
    }
    if (/^\d+\.\s/.test(trimmed)) {
      if (mode !== "ol") {
        flush()
        mode = "ol"
      }
      buf.push(trimmed.replace(/^\d+\.\s/, ""))
      continue
    }
    if (trimmed === "") {
      flush()
      mode = ""
      continue
    }
    if (mode !== "") {
      flush()
      mode = ""
    }
    buf.push(trimmed)
  }
  flush()
  return out
}

interface Inline {
  kind: "text" | "bold" | "italic" | "code" | "link"
  text: string
  href?: string
}

function tokenizeInline(text: string): Inline[] {
  const out: Inline[] = []
  const rx = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0
  for (const m of text.matchAll(rx)) {
    const idx = m.index ?? 0
    if (idx > last) out.push({ kind: "text", text: text.slice(last, idx) })
    if (m[2] !== undefined) out.push({ kind: "bold", text: m[2] ?? "" })
    else if (m[4] !== undefined) out.push({ kind: "italic", text: m[4] ?? "" })
    else if (m[6] !== undefined) out.push({ kind: "code", text: m[6] ?? "" })
    else if (m[8] !== undefined) out.push({ kind: "link", text: m[8] ?? "", href: m[9] ?? "" })
    last = idx + m[0].length
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) })
  return out
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function PostMarkdown({ body }: { body: string }) {
  const tokens = tokenize(body)

  return (
    <div className="space-y-3">
      {tokens.map((tk, i) => {
        if (tk.kind === "code") {
          return (
            <pre
              key={`code-${i}`}
              className="overflow-x-auto rounded-[var(--radius)] border border-line bg-surface-2 p-3 font-mono text-xs text-ink"
            >
              <code>{tk.text}</code>
            </pre>
          )
        }
        if (tk.kind === "blockquote") {
          return (
            <blockquote
              key={`bq-${i}`}
              className="border-l-2 border-accent pl-3 italic text-ink-muted"
            >
              <Inline text={tk.text} />
            </blockquote>
          )
        }
        if (tk.kind === "ul") {
          const items = tk.text.split(/(?<=\S)\s+(?=-|\*)/).filter(Boolean)
          // Easier: split on newlines if present, else single-line marker fallback
          const split = tk.text.includes("\n") ? tk.text.split("\n") : items
          return (
            <ul key={`ul-${i}`} className="ml-5 list-disc space-y-1 text-ink">
              {split.map((it, j) => (
                <li key={`ul-${i}-${j}`}>
                  <Inline text={it} />
                </li>
              ))}
            </ul>
          )
        }
        if (tk.kind === "ol") {
          const items = tk.text.split("\n")
          return (
            <ol key={`ol-${i}`} className="ml-5 list-decimal space-y-1 text-ink">
              {items.map((it, j) => (
                <li key={`ol-${i}-${j}`}>
                  <Inline text={it} />
                </li>
              ))}
            </ol>
          )
        }
        return (
          <p key={`p-${i}`} className="whitespace-pre-wrap text-ink">
            <Inline text={tk.text} />
          </p>
        )
      })}
    </div>
  )
}

function Inline({ text }: { text: string }) {
  const tokens = tokenizeInline(text)
  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === "bold") return <strong key={`b-${i}-${t.text.slice(0, 8)}`}>{t.text}</strong>
        if (t.kind === "italic") return <em key={`i-${i}-${t.text.slice(0, 8)}`}>{t.text}</em>
        if (t.kind === "code") {
          return (
            <code
              key={`c-${i}-${t.text.slice(0, 8)}`}
              className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs text-ink"
            >
              {t.text}
            </code>
          )
        }
        if (t.kind === "link") {
          const external = t.href?.startsWith("http")
          return (
            <a
              key={`l-${i}-${t.text.slice(0, 8)}`}
              href={t.href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className="text-accent hover:underline"
            >
              {t.text}
            </a>
          )
        }
        return (
          <span
            key={`t-${i}-${t.text.slice(0, 8)}`}
            dangerouslySetInnerHTML={{ __html: escapeHtml(t.text) }}
          />
        )
      })}
    </>
  )
}

// Suppress unused import warning for `useTranslations` since we keep the import
// for consistency with other client components (locale-aware aria etc.).
void useTranslations
