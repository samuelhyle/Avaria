/**
 * Indexer for product catalog content.
 *
 * Reads `lib/products/data.ts`, renders one document per (product × locale),
 * chunks each document, embeds the chunks, and upserts them into
 * `ai_documents` / `ai_document_chunks`.
 *
 * Idempotent — re-running with the same data replaces rows by (source,
 * source_id, locale) without duplicating chunks.
 */

import { aiDocumentChunks, aiDocuments } from "@/db/schema/ai"
import { type Chunk, chunkText } from "@/lib/ai/chunker"
import { embedBatch } from "@/lib/ai/rag/embeddings"
import { db } from "@/lib/db"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import type { Product, Locale as ProductLocale } from "@/lib/products/types"
import { formatSize } from "@/lib/utils/format"
import { and, eq, inArray } from "drizzle-orm"
import { catalogueSourceVersion } from "./version"

const SUPPORTED_LOCALES: ProductLocale[] = ["en", "fi", "de", "sv", "nl"]
const CATEGORY_LABELS: Record<Product["category"], string> = {
  metabolic: "Metabolic research",
  recovery: "Recovery & tissue",
  cognitive: "Cognitive research",
  longevity: "Longevity research",
  cosmetic: "Cosmetic research",
  blend: "Blends",
  supplies: "Lab supplies",
}

interface IndexerReport {
  documents: number
  chunks: number
  embedded: number
  skippedEmbeddings: number
  durationMs: number
}

function renderProductDocument(
  product: Product,
  locale: ProductLocale,
): { title: string; content: string } {
  const tr =
    locale === "en"
      ? product.defaultTranslation
      : (product.translations?.[locale] ?? product.defaultTranslation)

  const name = tr.name
  const tagline = tr.tagline
  const description = tr.description
  const category = CATEGORY_LABELS[product.category]

  const specs: string[] = []
  if (product.casNumber) specs.push(`CAS number: ${product.casNumber}`)
  if (product.molecularFormula) specs.push(`Molecular formula: ${product.molecularFormula}`)
  if (product.molecularWeight !== undefined)
    specs.push(`Molecular weight: ${product.molecularWeight} g/mol`)
  if (product.sequence) specs.push(`Sequence: ${product.sequence}`)
  specs.push(`Storage: ${product.storageTemp}`)

  const vials = product.vials.map((v) => `- ${formatSize(v, locale)}; SKU ${v.sku}`).join("\n")
  const batch =
    "Use getProduct and getBatches for current prices, stock and batch evidence. Indexed text does not establish current availability."

  const content = [
    `# ${name}`,
    tagline,
    "",
    `Category: ${category}`,
    "",
    "Description",
    description,
    "",
    "Specifications",
    ...specs,
    "",
    "Listed variants; consult live tools for availability",
    vials,
    "",
    "Latest batch",
    batch,
    "",
    "Research use only. Not for human or veterinary use.",
  ].join("\n")

  return { title: name, content }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function indexOneDocument(
  source: string,
  sourceId: string,
  locale: ProductLocale,
  title: string,
  content: string,
  url: string,
  sourceVersion?: string,
  keywordOnly = false,
): Promise<{ chunks: Chunk[]; embedded: number; skipped: number }> {
  const docId = `${source}:${sourceId}:${locale}`
  const chunks = chunkText(content, { maxTokens: 700, overlapTokens: 150 })
  if (chunks.length === 0) return { chunks: [], embedded: 0, skipped: 0 }

  // Embed in parallel before starting the DB transaction to minimize lock time.
  const embeddings = keywordOnly
    ? chunks.map(() => null)
    : await embedBatch(chunks.map((c) => c.content))
  const embedded = embeddings.filter((e): e is number[] => e !== null).length
  const skipped = embeddings.length - embedded

  const rows = chunks.map((c, i) => ({
    id: uuid(),
    documentId: docId,
    locale,
    position: c.position,
    content: c.content,
    tokenCount: c.tokenCount,
    embedding: embeddings[i] ?? null,
  }))

  // Atomic delete + insert — prevents data loss on crash between the two.
  await db.transaction(async (tx) => {
    // Upsert document row.
    await tx
      .insert(aiDocuments)
      .values({
        id: docId,
        source,
        sourceId,
        locale,
        title,
        url,
        metadata: { category: source, reviewVersion: "research-reviewed-v1", sourceVersion },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aiDocuments.id,
        set: {
          title,
          url,
          metadata: { category: source, reviewVersion: "research-reviewed-v1", sourceVersion },
          updatedAt: new Date(),
        },
      })

    await tx.delete(aiDocumentChunks).where(eq(aiDocumentChunks.documentId, docId))
    const INSERT_BATCH = 200
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      await tx.insert(aiDocumentChunks).values(rows.slice(i, i + INSERT_BATCH))
    }
  })

  return { chunks, embedded, skipped }
}

/** Flatten Portable Text (Sanity) to plain text for indexing. */
function portableTextToPlain(value: unknown): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map(portableTextToPlain).filter(Boolean).join("\n")
  if (typeof value === "object") {
    const node = value as { _type?: string; children?: unknown[]; text?: string }
    if (node._type === "block" && Array.isArray(node.children)) {
      return node.children.map(portableTextToPlain).join("")
    }
    if (typeof node.text === "string") return node.text
    if (Array.isArray(node.children)) return node.children.map(portableTextToPlain).join("")
  }
  return ""
}

/** Index glossary terms (Sanity-backed with static fallback). */
async function indexGlossary(
  addResult: (chunks: number, embedded: number, skipped: number) => void,
): Promise<void> {
  try {
    const { listGlossaryTerms } = await import("@/lib/glossary/sanity")
    const terms = await listGlossaryTerms()
    for (const term of terms) {
      const content = [
        `# ${term.term}`,
        term.shortDefinition,
        "",
        portableTextToPlain(term.body),
        "",
        `Category: ${term.category}`,
      ].join("\n")
      const result = await indexOneDocument(
        "glossary",
        term.slug,
        "en",
        term.term,
        content,
        `/en/glossary/${term.slug}`,
      )
      addResult(result.chunks.length, result.embedded, result.skipped)
    }
  } catch (err) {
    console.warn("[ai-index] glossary source skipped:", err instanceof Error ? err.message : err)
  }
}

/** Index blog posts (Sanity-backed with fallback). */
async function indexBlog(
  addResult: (chunks: number, embedded: number, skipped: number) => void,
): Promise<void> {
  try {
    const { listPosts } = await import("@/lib/blog/posts")
    const posts = await listPosts()
    for (const post of posts) {
      const content = [
        `# ${post.title}`,
        post.excerpt ?? "",
        "",
        portableTextToPlain(post.body),
      ].join("\n")
      const result = await indexOneDocument(
        "blog",
        post.slug,
        "en",
        post.title,
        content,
        `/en/blog/${post.slug}`,
      )
      addResult(result.chunks.length, result.embedded, result.skipped)
    }
  } catch (err) {
    console.warn("[ai-index] blog source skipped:", err instanceof Error ? err.message : err)
  }
}

export async function indexAll(): Promise<IndexerReport> {
  const startedAt = Date.now()
  let totalChunks = 0
  let totalEmbedded = 0
  let totalSkipped = 0
  let totalDocs = 0

  const addResult = (chunks: number, embedded: number, skipped: number) => {
    totalDocs += 1
    totalChunks += chunks
    totalEmbedded += embedded
    totalSkipped += skipped
  }

  const catalog = await getStorefrontCatalogue()
  for (const product of catalog) {
    for (const locale of SUPPORTED_LOCALES) {
      const { title, content } = renderProductDocument(product, locale)
      const result = await indexOneDocument(
        "product",
        product.slug,
        locale,
        title,
        content,
        `/${locale}/shop/${product.slug}`,
        catalogueSourceVersion(product),
      )
      addResult(result.chunks.length, result.embedded, result.skipped)
    }
  }

  // Editorial + reference sources (best-effort: their CMS may be unavailable).
  await indexGlossary(addResult)
  await indexBlog(addResult)

  return {
    documents: totalDocs,
    chunks: totalChunks,
    embedded: totalEmbedded,
    skippedEmbeddings: totalSkipped,
    durationMs: Date.now() - startedAt,
  }
}

/** Reindex a single document by source + source_id (used by Sanity webhooks in A2). */
export async function reindexDocument(
  source: string,
  sourceId: string,
): Promise<IndexerReport | null> {
  const startedAt = Date.now()
  let totalChunks = 0
  let totalEmbedded = 0
  let totalSkipped = 0
  let totalDocs = 0

  if (source === "product") {
    const catalog = await getStorefrontCatalogue()
    const product = catalog.find((p) => p.slug === sourceId)
    if (!product) return null
    for (const locale of SUPPORTED_LOCALES) {
      const { title, content } = renderProductDocument(product, locale)
      const result = await indexOneDocument(
        source,
        sourceId,
        locale,
        title,
        content,
        `/${locale}/shop/${sourceId}`,
      )
      totalDocs += 1
      totalChunks += result.chunks.length
      totalEmbedded += result.embedded
      totalSkipped += result.skipped
    }
  } else if (source === "glossary") {
    const { getGlossaryTermBySlug } = await import("@/lib/glossary/sanity")
    const term = await getGlossaryTermBySlug(sourceId)
    if (!term) return null
    const content = [
      `# ${term.term}`,
      term.shortDefinition,
      "",
      portableTextToPlain(term.body),
    ].join("\n")
    const result = await indexOneDocument(
      source,
      sourceId,
      "en",
      term.term,
      content,
      `/en/glossary/${term.slug}`,
    )
    totalDocs += 1
    totalChunks += result.chunks.length
    totalEmbedded += result.embedded
    totalSkipped += result.skipped
  } else if (source === "blog") {
    const { getPostBySlug } = await import("@/lib/blog/posts")
    const post = await getPostBySlug(sourceId)
    if (!post) return null
    const content = [
      `# ${post.title}`,
      post.excerpt ?? "",
      "",
      portableTextToPlain(post.body),
    ].join("\n")
    const result = await indexOneDocument(
      source,
      sourceId,
      "en",
      post.title,
      content,
      `/en/blog/${post.slug}`,
    )
    totalDocs += 1
    totalChunks += result.chunks.length
    totalEmbedded += result.embedded
    totalSkipped += result.skipped
  } else {
    return null
  }

  return {
    documents: totalDocs,
    chunks: totalChunks,
    embedded: totalEmbedded,
    skippedEmbeddings: totalSkipped,
    durationMs: Date.now() - startedAt,
  }
}

/** Used by the CLI; kept here so the test suite can hit it too. */
export async function purgeAll(): Promise<void> {
  // Delete in dependency order.
  await db.delete(aiDocumentChunks)
  await db.delete(aiDocuments)
}

export const __test = { renderProductDocument, indexOneDocument }

// Used by A2 to remove documents from a source when a Sanity record is deleted.
export async function purgeSource(source: string, sourceIds?: string[]): Promise<void> {
  if (sourceIds && sourceIds.length > 0) {
    const docs = await db
      .select({ id: aiDocuments.id })
      .from(aiDocuments)
      .where(and(eq(aiDocuments.source, source), inArray(aiDocuments.sourceId, sourceIds)))
    const docIds = docs.map((d) => d.id)
    if (docIds.length > 0) {
      await db.delete(aiDocumentChunks).where(inArray(aiDocumentChunks.documentId, docIds))
      await db.delete(aiDocuments).where(inArray(aiDocuments.id, docIds))
    }
    return
  }
  await db
    .delete(aiDocumentChunks)
    .where(
      inArray(
        aiDocumentChunks.documentId,
        db.select({ id: aiDocuments.id }).from(aiDocuments).where(eq(aiDocuments.source, source)),
      ),
    )
}

/** Bounded keyword updates; explicit full indexing can also create embeddings. */
export async function syncCatalogueIndex(limit = 2) {
  const catalog = await getStorefrontCatalogue()
  if (!catalog.length || catalog.some((p) => p.dataSource !== "database")) return { updated: 0 }
  const stored = await db.select().from(aiDocuments).where(eq(aiDocuments.source, "product"))
  const versions = new Map(
    stored.map((d) => [d.id, (d.metadata as { sourceVersion?: string } | null)?.sourceVersion]),
  )
  let updated = 0
  for (const product of catalog)
    for (const locale of SUPPORTED_LOCALES) {
      if (updated >= limit) return { updated }
      const revision = catalogueSourceVersion(product)
      if (versions.get(`product:${product.slug}:${locale}`) === revision) continue
      const doc = renderProductDocument(product, locale)
      await indexOneDocument(
        "product",
        product.slug,
        locale,
        doc.title,
        doc.content,
        `/${locale}/shop/${product.slug}`,
        revision,
        true,
      )
      updated++
    }
  const valid = new Set(catalog.map((p) => p.slug))
  for (const doc of stored)
    if (!valid.has(doc.sourceId)) await purgeSource("product", [doc.sourceId])
  return { updated }
}
