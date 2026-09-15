/**
 * Citation engine — discriminated union of citations the AI agent
 * can emit. Mirrors v1's `components/agent/citation-chip.tsx:40`
 * but rebuilt against v2's `lib/ai/*` architecture.
 *
 * The agent prompt instructs the model to emit citations as inline
 * markers with the syntax: `[cite:<kind>:<label>]` where label is
 * either a slug, an anchor, or a doc/thread id.
 */

export type Citation =
  | { kind: "field"; label: string; anchor: string } // jump to product field
  | { kind: "doc"; label: string; documentId: string } // open /documents/[id]
  | { kind: "market"; label: string; marketCode: string } // show eligibility rule
  | { kind: "thread"; label: string; threadSlug: string } // jump to forum thread
  | { kind: "glossary"; label: string; slug: string } // jump to /glossary/[slug]

const KIND_TONE: Record<Citation["kind"], "accent" | "ice" | "success" | "warn" | "muted"> = {
  field: "accent",
  doc: "muted",
  market: "warn",
  thread: "ice",
  glossary: "success",
}

const KIND_ICON: Record<Citation["kind"], string> = {
  field: "§",
  doc: "📄",
  market: "⚑",
  thread: "💬",
  glossary: "≡",
}

export function getCitationTone(kind: Citation["kind"]) {
  return KIND_TONE[kind]
}

export function getCitationIcon(kind: Citation["kind"]) {
  return KIND_ICON[kind]
}

/**
 * Parse inline citation markers from agent output.
 * Format: `[cite:field sku:BPC-157#mechanism]` etc.
 * Label part is everything after the kind up to the closing bracket,
 * optionally followed by `#anchor` for `field` kind.
 */
const CITATION_REGEX = /\[cite:(field|doc|market|thread|glossary)\s+([^\]]+)\]/g

export function parseCitations(text: string): { cleaned: string; citations: Citation[] } {
  const seen = new Map<string, Citation>()
  const cleaned = text.replace(CITATION_REGEX, (_m, kind: string, raw: string) => {
    const trimmed = raw.trim()
    if (kind === "field") {
      const hashIdx = trimmed.indexOf("#")
      const label = hashIdx >= 0 ? trimmed.slice(0, hashIdx).trim() : trimmed
      const anchor = hashIdx >= 0 ? trimmed.slice(hashIdx + 1).trim() : "specs"
      const key = `field:${label}#${anchor}`
      if (!seen.has(key)) seen.set(key, { kind: "field", label, anchor })
      return ""
    }
    if (kind === "doc") {
      const parts = trimmed.split(/\s+/)
      const label = parts[0] ?? trimmed
      const id = parts[1] ?? label
      const key = `doc:${id}`
      if (!seen.has(key)) seen.set(key, { kind: "doc", label, documentId: id })
      return ""
    }
    if (kind === "market") {
      const key = `market:${trimmed}`
      if (!seen.has(key)) seen.set(key, { kind: "market", label: trimmed, marketCode: trimmed })
      return ""
    }
    if (kind === "thread") {
      const key = `thread:${trimmed}`
      if (!seen.has(key)) seen.set(key, { kind: "thread", label: trimmed, threadSlug: trimmed })
      return ""
    }
    if (kind === "glossary") {
      const key = `glossary:${trimmed}`
      if (!seen.has(key)) seen.set(key, { kind: "glossary", label: trimmed, slug: trimmed })
      return ""
    }
    return ""
  })
  // Collapse double whitespace left by stripped citations
  const collapsed = cleaned.replace(/[ \t]{2,}/g, " ").replace(/ *\n */g, "\n")
  return { cleaned: collapsed, citations: Array.from(seen.values()) }
}

/**
 * Resolve a citation to a concrete URL path within the app.
 */
export function citationHref(c: Citation, locale: string): string {
  switch (c.kind) {
    case "field":
      return `/${locale}/shop/${c.label}#${c.anchor}`
    case "doc":
      return `/${locale}/documents/${c.documentId}`
    case "market":
      return `/${locale}/lab-tests?market=${c.marketCode}`
    case "thread":
      return `/${locale}/community/thread/${c.threadSlug}`
    case "glossary":
      return `/${locale}/glossary/${c.slug}`
  }
}
