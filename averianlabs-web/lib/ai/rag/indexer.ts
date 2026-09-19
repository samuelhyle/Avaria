/**
 * Indexer for product catalog content.
 *
 * Reads `lib/products/data.ts`, renders one document per (product × locale),
 * chunks each document, embeds the chunks, and upserts them into
 * `ai_documents` / `ai_document_chunks`.
 *
 * Idempotent — re-running with the same data replaces rows by (source,
 * source_id, locale) without duplicating chunks.
 *
 * Labels (category names, section headings) are locale-aware so the indexed
 * content matches what the user actually reads on the site.
 */

import { aiDocumentChunks, aiDocuments } from "@/db/schema/ai"
import { type Chunk, chunkText } from "@/lib/ai/chunker"
import { embedBatch } from "@/lib/ai/rag/embeddings"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { products as catalog } from "@/lib/products/data"
import type { Product, Locale as ProductLocale } from "@/lib/products/types"
import { safeUuid } from "@/lib/utils/uuid"
import { and, eq, inArray } from "drizzle-orm"

const SUPPORTED_LOCALES: ProductLocale[] = ["en", "fi", "de", "sv", "nl"]

const CATEGORY_LABELS: Record<ProductLocale, Record<Product["category"], string>> = {
  en: {
    metabolic: "Metabolism & receptor signaling",
    recovery: "Recovery & tissue",
    cognitive: "Cognitive research",
    longevity: "Longevity research",
    cosmetic: "Cosmetic research",
    blend: "Blends",
    supplies: "Lab supplies",
  },
  fi: {
    metabolic: "Metabolia ja reseptorisignalointi",
    recovery: "Palautuminen ja kudos",
    cognitive: "Kognitiivinen tutkimus",
    longevity: "Pitkäikäisyystutkimus",
    cosmetic: "Kosmetiikkatutkimus",
    blend: "Sekoitukset",
    supplies: "Laboratoriotarvikkeet",
  },
  de: {
    metabolic: "Stoffwechsel & Rezeptorsignalisierung",
    recovery: "Regeneration & Gewebe",
    cognitive: "Kognitionsforschung",
    longevity: "Langlebigkeitsforschung",
    cosmetic: "Kosmetikforschung",
    blend: "Mischungen",
    supplies: "Laborbedarf",
  },
  sv: {
    metabolic: "Metabolism & receptorsignalering",
    recovery: "Återhämtning & vävnad",
    cognitive: "Kognitiv forskning",
    longevity: "Livslängdsforskning",
    cosmetic: "Kosmetikforskning",
    blend: "Blandningar",
    supplies: "Labbförbrukning",
  },
  nl: {
    metabolic: "Metabolisme en receptorsignalering",
    recovery: "Herstel en weefsel",
    cognitive: "Cognitief onderzoek",
    longevity: "Langlevensonderzoek",
    cosmetic: "Cosmetisch onderzoek",
    blend: "Mengsels",
    supplies: "Labbenodigdheden",
  },
}

const SECTION_LABELS: Record<ProductLocale, Record<string, string>> = {
  en: {
    description: "Description",
    specifications: "Specifications",
    availableVials: "Available vials",
    latestBatch: "Latest batch",
    inStock: "in stock",
    outOfStock: "out of stock",
    compareAt: "compare at",
    researchUseOnly: "Research use only. Not for human or veterinary use.",
    noBatch: "No batch data published.",
  },
  fi: {
    description: "Kuvaus",
    specifications: "Tekniset tiedot",
    availableVials: "Saatavilla olevat pullot",
    latestBatch: "Viimeisin erä",
    inStock: "varastossa",
    outOfStock: "loppu varastosta",
    compareAt: "vertaushinta",
    researchUseOnly: "Vain tutkimuskäyttöön. Ei ihmis- tai eläinkäyttöön.",
    noBatch: "Erätietoja ei julkaistu.",
  },
  de: {
    description: "Beschreibung",
    specifications: "Spezifikationen",
    availableVials: "Verfügbare Vials",
    latestBatch: "Letzte Charge",
    inStock: "auf Lager",
    outOfStock: "nicht vorrätig",
    compareAt: "Vergleichspreis",
    researchUseOnly:
      "Nur für Forschungszwecke. Nicht für den menschlichen oder tierärztlichen Gebrauch.",
    noBatch: "Keine Chargendaten veröffentlicht.",
  },
  sv: {
    description: "Beskrivning",
    specifications: "Specifikationer",
    availableVials: "Tillgängliga vials",
    latestBatch: "Senaste batch",
    inStock: "i lager",
    outOfStock: "slut i lager",
    compareAt: "jämförpris",
    researchUseOnly: "Endast för forskningsändamål. Inte för humant eller veterinärt bruk.",
    noBatch: "Inga batchdata publicerade.",
  },
  nl: {
    description: "Beschrijving",
    specifications: "Specificaties",
    availableVials: "Beschikbare vials",
    latestBatch: "Laatste batch",
    inStock: "op voorraad",
    outOfStock: "niet op voorraad",
    compareAt: "vergelijkingsprijs",
    researchUseOnly: "Alleen voor onderzoeksdoeleinden. Niet voor menselijk of veterinair gebruik.",
    noBatch: "Geen batchgegevens gepubliceerd.",
  },
}

function lbl(locale: ProductLocale, key: keyof (typeof SECTION_LABELS)["en"]): string {
  const value = SECTION_LABELS[locale][key]
  return value ?? key
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
  const category = CATEGORY_LABELS[locale][product.category]

  const specLabels = getSpecLabels(locale)
  const specs: string[] = []
  if (product.casNumber) specs.push(`${specLabels.cas}: ${product.casNumber}`)
  if (product.molecularFormula) specs.push(`${specLabels.formula}: ${product.molecularFormula}`)
  if (product.molecularWeight !== undefined)
    specs.push(`${specLabels.weight}: ${product.molecularWeight} g/mol`)
  if (product.sequence) specs.push(`${specLabels.sequence}: ${product.sequence}`)
  specs.push(`${specLabels.storage}: ${product.storageTemp}`)
  if (product.purityPercent !== undefined)
    specs.push(`${specLabels.purity}: ${product.purityPercent}%`)

  const vials = product.vials
    .map(
      (v) =>
        `- ${v.mg} mg vial · SKU ${v.sku} · €${(v.priceCents / 100).toFixed(2)} · ${
          v.stockQty > 0 ? `${v.stockQty} ${lbl(locale, "inStock")}` : lbl(locale, "outOfStock")
        }${v.compareAtCents ? ` (${lbl(locale, "compareAt")} €${(v.compareAtCents / 100).toFixed(2)})` : ""}`,
    )
    .join("\n")

  const batchLabels = getBatchLabels(locale)
  const batch = product.latestBatch
    ? `${batchLabels.latest} ${product.latestBatch.code}: ${batchLabels.manufactured} ${product.latestBatch.manufacturedAt}, ${batchLabels.expires} ${product.latestBatch.expiresAt}, ${batchLabels.purity} ${product.latestBatch.hplcPurity}%, ${batchLabels.endotoxin} ${product.latestBatch.endotoxinEUPerMg} EU/mg, ${batchLabels.ms}: ${product.latestBatch.msConfirmed}, ${batchLabels.tested} ${product.latestBatch.lab}.`
    : lbl(locale, "noBatch")

  const content = [
    `# ${name}`,
    tagline,
    "",
    `${batchLabels.category}: ${category}`,
    "",
    lbl(locale, "description"),
    description,
    "",
    lbl(locale, "specifications"),
    ...specs,
    "",
    lbl(locale, "availableVials"),
    vials,
    "",
    lbl(locale, "latestBatch"),
    batch,
    "",
    lbl(locale, "researchUseOnly"),
  ].join("\n")

  return { title: name, content }
}

const SPEC_LABELS: Record<
  ProductLocale,
  {
    cas: string
    formula: string
    weight: string
    sequence: string
    storage: string
    purity: string
  }
> = {
  en: {
    cas: "CAS number",
    formula: "Molecular formula",
    weight: "Molecular weight",
    sequence: "Sequence",
    storage: "Storage",
    purity: "HPLC purity",
  },
  fi: {
    cas: "CAS-numero",
    formula: "Molekyylikaava",
    weight: "Molekyylimassa",
    sequence: "Sekvenssi",
    storage: "Säilytys",
    purity: "HPLC-puhtaus",
  },
  de: {
    cas: "CAS-Nummer",
    formula: "Molekülformel",
    weight: "Molekülmasse",
    sequence: "Sequenz",
    storage: "Lagerung",
    purity: "HPLC-Reinheit",
  },
  sv: {
    cas: "CAS-nummer",
    formula: "Molekylformel",
    weight: "Molekylvikt",
    sequence: "Sekvens",
    storage: "Förvaring",
    purity: "HPLC-renhet",
  },
  nl: {
    cas: "CAS-nummer",
    formula: "Molecuulformule",
    weight: "Molecuulmassa",
    sequence: "Sequentie",
    storage: "Opslag",
    purity: "HPLC-zuiverheid",
  },
}

const BATCH_LABELS: Record<
  ProductLocale,
  {
    latest: string
    manufactured: string
    expires: string
    purity: string
    endotoxin: string
    ms: string
    tested: string
    category: string
  }
> = {
  en: {
    latest: "Latest batch",
    manufactured: "manufactured",
    expires: "expires",
    purity: "HPLC purity",
    endotoxin: "endotoxin",
    ms: "mass-spec confirmed",
    tested: "tested at",
    category: "Category",
  },
  fi: {
    latest: "Viimeisin erä",
    manufactured: "valmistettu",
    expires: "vanhenee",
    purity: "HPLC-puhtaus",
    endotoxin: "endotoksiini",
    ms: "massaspektri vahvistettu",
    tested: "testattu",
    category: "Kategoria",
  },
  de: {
    latest: "Letzte Charge",
    manufactured: "hergestellt",
    expires: "läuft ab",
    purity: "HPLC-Reinheit",
    endotoxin: "Endotoxin",
    ms: "Massenspektrum bestätigt",
    tested: "getestet bei",
    category: "Kategorie",
  },
  sv: {
    latest: "Senaste batch",
    manufactured: "tillverkad",
    expires: "löper ut",
    purity: "HPLC-renhet",
    endotoxin: "endotoxin",
    ms: "masspektri bekräftat",
    tested: "testad vid",
    category: "Kategori",
  },
  nl: {
    latest: "Laatste batch",
    manufactured: "vervaardigd",
    expires: "verloopt",
    purity: "HPLC-zuiverheid",
    endotoxin: "endotoxine",
    ms: "massaspectrometrie bevestigd",
    tested: "getest bij",
    category: "Categorie",
  },
}

function getSpecLabels(locale: ProductLocale) {
  return SPEC_LABELS[locale]
}
function getBatchLabels(locale: ProductLocale) {
  return BATCH_LABELS[locale]
}

async function indexOneDocument(
  source: string,
  sourceId: string,
  locale: ProductLocale,
  title: string,
  content: string,
  url: string,
): Promise<{ chunks: Chunk[]; embedded: number; skipped: number }> {
  const docId = `${source}:${sourceId}:${locale}`
  const chunks = chunkText(content, { maxTokens: 700, overlapTokens: 150 })
  if (chunks.length === 0) return { chunks: [], embedded: 0, skipped: 0 }

  // Upsert document row.
  await db
    .insert(aiDocuments)
    .values({
      id: docId,
      source,
      sourceId,
      locale,
      title,
      url,
      metadata: { category: source },
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: aiDocuments.id,
      set: { title, url, updatedAt: new Date() },
    })

  // Embed in parallel before starting the DB transaction to minimize lock time.
  const embeddings = await embedBatch(chunks.map((c) => c.content))
  const embedded = embeddings.filter((e): e is number[] => e !== null).length
  const skipped = embeddings.length - embedded

  const rows = chunks.map((c, i) => ({
    id: safeUuid(),
    documentId: docId,
    locale,
    position: c.position,
    content: c.content,
    tokenCount: c.tokenCount,
    embedding: embeddings[i] ?? null,
  }))

  // Atomic delete + insert — prevents data loss on crash between the two.
  await db.transaction(async (tx) => {
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

/** Index glossary terms (Sanity-backed with static locale-aware fallback). */
async function indexGlossary(
  addResult: (chunks: number, embedded: number, skipped: number) => void,
): Promise<void> {
  try {
    const { listGlossaryTerms } = await import("@/lib/glossary/sanity")
    const sanityTerms = await listGlossaryTerms()
    const sanitySlugs = new Set(sanityTerms.map((t) => t.slug))

    for (const term of sanityTerms) {
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

    // Locale-aware static glossary — published once per locale for retrieval
    // parity with the on-page rendering. Skipped if a Sanity entry with the
    // same slug already exists so we never produce duplicates.
    const { GLOSSARY: staticTerms } = await import("@/lib/knowledge/glossary")
    const categoryLabelByLocale: Record<ProductLocale, Record<string, string>> = {
      en: {
        analysis: "Analysis",
        sequence: "Sequence",
        formulation: "Formulation",
        storage: "Storage",
        regulatory: "Regulatory",
      },
      fi: {
        analysis: "Analyysi",
        sequence: "Sekvenssi",
        formulation: "Formulaatio",
        storage: "Säilytys",
        regulatory: "Sääntely",
      },
      de: {
        analysis: "Analyse",
        sequence: "Sequenz",
        formulation: "Formulierung",
        storage: "Lagerung",
        regulatory: "Regulierung",
      },
      sv: {
        analysis: "Analys",
        sequence: "Sekvens",
        formulation: "Formulering",
        storage: "Förvaring",
        regulatory: "Reglering",
      },
      nl: {
        analysis: "Analyse",
        sequence: "Sequentie",
        formulation: "Formulering",
        storage: "Opslag",
        regulatory: "Regelgeving",
      },
    }

    for (const term of staticTerms) {
      if (sanitySlugs.has(term.slug)) continue
      for (const locale of SUPPORTED_LOCALES) {
        const tr = term.translations[locale]
        const catLabel = categoryLabelByLocale[locale][term.category] ?? term.category
        const content = [`# ${tr.term}`, tr.short, "", tr.long, "", `Category: ${catLabel}`].join(
          "\n",
        )
        const result = await indexOneDocument(
          "glossary",
          term.slug,
          locale,
          tr.term,
          content,
          `/${locale}/glossary/${term.slug}`,
        )
        addResult(result.chunks.length, result.embedded, result.skipped)
      }
    }
  } catch (err) {
    logger.warn("[ai-index] glossary source skipped:", err instanceof Error ? err.message : err)
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
    logger.warn("[ai-index] blog source skipped:", err instanceof Error ? err.message : err)
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
