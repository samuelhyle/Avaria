/**
 * Glossary data layer — Sanity-backed.
 *
 * Provides typed query helpers for glossary terms. Falls back gracefully
 * to a static demo fixture set when Sanity is not configured, so the UI
 * never crashes (useful during local dev without Sanity creds and for
 * the static Netlify demo build).
 */
import { DEMO_GLOSSARY } from "@/lib/demo/fixtures"
import { demoCache } from "@/lib/demo/cache"
import { isDemoBuild } from "@/lib/demo"
import { sanity } from "@/sanity/client"

export type GlossaryCategory =
  | "analytical"
  | "chemistry"
  | "compliance"
  | "logistics"
  | "product"
  | "regulatory"

export interface GlossaryTermRecord {
  _id: string
  term: string
  slug: string
  category: GlossaryCategory
  shortDefinition: string
  body: unknown // Portable Text — left as `unknown` here, rendered via PortableText in the page.
  relatedProductSlugs?: string[]
  relatedTerms?: { _id: string; term: string; slug: string }[]
  synonyms?: string[]
}

const FRAGMENT = /* groq */ `
  _id,
  term,
  "slug": slug.current,
  category,
  shortDefinition,
  body,
  relatedProductSlugs,
  "relatedTerms": relatedTerms[]->{ _id, term, "slug": slug.current },
  synonyms
`

function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) && !isDemoBuild()
}

export const listGlossaryTerms = demoCache(
  async (): Promise<GlossaryTermRecord[]> => {
    if (isDemoBuild()) return DEMO_GLOSSARY
    if (!isConfigured()) return []
    try {
      return await sanity.fetch<GlossaryTermRecord[]>(
        `*[_type == "glossaryTerm"] | order(term asc) { ${FRAGMENT} }`,
      )
    } catch {
      return []
    }
  },
  ["glossary:terms"],
  { revalidate: 3600, tags: ["glossary"] },
)

export const getGlossaryTermBySlug = demoCache(
  async (slug: string): Promise<GlossaryTermRecord | null> => {
    if (isDemoBuild()) return DEMO_GLOSSARY.find((t) => t.slug === slug) ?? null
    if (!isConfigured()) return null
    try {
      const result = await sanity.fetch<GlossaryTermRecord | null>(
        `*[_type == "glossaryTerm" && slug.current == $slug][0] { ${FRAGMENT} }`,
        { slug },
      )
      return result ?? null
    } catch {
      return null
    }
  },
  ["glossary:term"],
  { revalidate: 3600, tags: ["glossary"] },
)

export async function getGlossaryTermsByCategory(): Promise<
  Record<GlossaryCategory, GlossaryTermRecord[]>
> {
  const all = await listGlossaryTerms()
  const grouped: Record<GlossaryCategory, GlossaryTermRecord[]> = {
    analytical: [],
    chemistry: [],
    compliance: [],
    logistics: [],
    product: [],
    regulatory: [],
  }
  for (const t of all) {
    if (grouped[t.category]) grouped[t.category].push(t)
  }
  return grouped
}

export const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  analytical: "Analytical",
  chemistry: "Chemistry",
  compliance: "Compliance",
  logistics: "Logistics",
  product: "Product",
  regulatory: "Regulatory",
}

/**
 * Inline-link helper — turns a piece of text into one with anchor tags around
 * known glossary term matches. Returns an array of plain strings and link
 * objects, ready to render with React.
 */
export interface InlineHit {
  kind: "text" | "link"
  text: string
  href?: string
  term?: string
}

export function annotateWithGlossary(text: string, terms: GlossaryTermRecord[]): InlineHit[] {
  if (!text || terms.length === 0) return [{ kind: "text", text }]

  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length)
  const pattern = new RegExp(`\\b(${sorted.map((t) => escapeRegex(t.term)).join("|")})\\b`, "gi")

  const hits: InlineHit[] = []
  let last = 0
  for (const m of text.matchAll(pattern)) {
    const idx = m.index ?? 0
    if (idx > last) hits.push({ kind: "text", text: text.slice(last, idx) })
    const matched = m[0]
    const term = sorted.find((t) => t.term.toLowerCase() === matched.toLowerCase())
    if (term) {
      hits.push({
        kind: "link",
        text: matched,
        href: `/glossary/${term.slug}`,
        term: term.term,
      })
    } else {
      hits.push({ kind: "text", text: matched })
    }
    last = idx + matched.length
  }
  if (last < text.length) hits.push({ kind: "text", text: text.slice(last) })
  return hits
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
