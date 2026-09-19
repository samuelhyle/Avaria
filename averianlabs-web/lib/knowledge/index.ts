/**
 * Knowledge base indexer.
 *
 * Builds a single in-memory snapshot of every public knowledge artefact
 * (documents, glossary, lab tests, blog, products, COAs) for the
 * `/documents` landing surface and for the AI retrieval helper.
 *
 * Designed to never throw on missing data — empty arrays are returned when
 * Sanity / DB lookups fail, so the page can render an empty state.
 */

import { listBatchSummaries } from "@/lib/coa/lookup"
import { listRecentDocuments } from "@/lib/documents/service"
import { listGlossaryTerms } from "@/lib/glossary/sanity"
import { products } from "@/lib/products/data"

import { GLOSSARY, type GlossaryTerm } from "./glossary"

export interface KnowledgeDocument {
  id: string
  title: string
  href: string
  type: "documents" | "lab-tests" | "blog" | "glossary" | "calculator" | "products" | "coa"
}

export interface KnowledgeCategorySummary {
  key: KnowledgeDocument["type"]
  href: string
  items: KnowledgeDocument[]
  count: number
}

export interface KnowledgeIndex {
  totalCount: number
  categories: KnowledgeCategorySummary[]
}

async function listSafe<T>(loader: () => Promise<T[]>, fallback: T[] = []): Promise<T[]> {
  try {
    return await loader()
  } catch {
    return fallback
  }
}

export async function getKnowledgeIndex(): Promise<KnowledgeIndex> {
  const [docs, batches, sanityTerms] = await Promise.all([
    listSafe(async () => {
      const rows = await listRecentDocuments({ limit: 500 })
      return rows.map((d) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        productSlug: d.productSlug,
      }))
    }),
    listSafe(async () => listBatchSummaries()),
    listSafe(async () => listGlossaryTerms()),
  ])

  const productItems: KnowledgeDocument[] = products.map((p) => ({
    id: p.slug,
    title: p.defaultTranslation.name,
    href: `/shop/${p.slug}`,
    type: "products" as const,
  }))

  const glossaryStatic = GLOSSARY.map((term) => ({
    id: term.slug,
    title: term.slug,
    href: `/glossary/${term.slug}`,
    type: "glossary" as const,
  }))

  const glossarySanity = sanityTerms.map((t) => ({
    id: t.slug,
    title: t.term,
    href: `/glossary/${t.slug}`,
    type: "glossary" as const,
  }))

  const allGlossary = [...glossaryStatic]
  const seenGlossary = new Set(glossaryStatic.map((g) => g.id))
  for (const g of glossarySanity) {
    if (!seenGlossary.has(g.id)) {
      allGlossary.push(g)
      seenGlossary.add(g.id)
    }
  }

  const documentItems: KnowledgeDocument[] = docs.map((d) => ({
    id: d.id,
    title: d.title,
    href: `/documents/${d.id}`,
    type: "documents" as const,
  }))

  const coaItems: KnowledgeDocument[] = batches.map((b) => ({
    id: b.code,
    title: `${b.productName} · ${b.code}`,
    href: `/coa/${b.code}`,
    type: "coa" as const,
  }))

  const categories: KnowledgeCategorySummary[] = [
    {
      key: "coa",
      href: "/coa",
      items: coaItems,
      count: coaItems.length,
    },
    {
      key: "lab-tests",
      href: "/lab-tests",
      items: [],
      count: 4,
    },
    {
      key: "products",
      href: "/shop",
      items: productItems,
      count: productItems.length,
    },
    {
      key: "documents",
      href: "/documents",
      items: documentItems,
      count: documentItems.length,
    },
    {
      key: "blog",
      href: "/blog",
      items: [],
      count: 0,
    },
    {
      key: "glossary",
      href: "/glossary",
      items: allGlossary,
      count: allGlossary.length,
    },
    {
      key: "calculator",
      href: "/peptide-calculator",
      items: [],
      count: 1,
    },
  ]

  const totalCount = categories.reduce((sum, c) => sum + c.count, 0)
  return { totalCount, categories }
}

export function getStaticGlossaryTerms() {
  return GLOSSARY
}

export function getStaticGlossaryByCategory() {
  const buckets: Partial<Record<GlossaryTerm["category"], GlossaryTerm[]>> = {}
  for (const term of GLOSSARY) {
    const bucket = buckets[term.category] ?? []
    bucket.push(term)
    buckets[term.category] = bucket
  }
  return buckets
}
