import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { products } from "@/lib/products/data"
import type { Locale } from "@/lib/products/types"
import { findCheapestVial, totalStock } from "@/lib/products/vials"
import { MeiliSearch } from "meilisearch"

const env = getServerEnv()
const MEILI_HOST = env.MEILI_HOST
// Support both the documented name and the legacy MASTER/SEARCH aliases.
const MEILI_KEY = env.MEILI_API_KEY ?? env.MEILI_MASTER_KEY ?? env.MEILI_SEARCH_KEY

const ALLOWED_SORTS = ["minPriceCents:asc", "minPriceCents:desc", "purityPercent:desc"]
const SAFE_TOKEN = /^[a-zA-Z0-9._ -]+$/

function isSafeFilterValue(value: string): boolean {
  return value.length <= 64 && SAFE_TOKEN.test(value) && !value.includes('"')
}

function isSafeLocale(value: string): boolean {
  return ["en", "fi", "de", "sv", "nl"].includes(value)
}

function getClient(): MeiliSearch | null {
  if (!MEILI_HOST || !MEILI_KEY) return null
  // Hard timeout so a slow/unreachable Meilisearch can't stall page renders.
  return new MeiliSearch({ host: MEILI_HOST, apiKey: MEILI_KEY, timeout: 5_000 })
}

export interface SearchProduct {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  category: string
  purityPercent: number | null
  minPriceCents: number
  casNumber: string | null
  inStock: boolean
  batchCode: string | null
  locale: string
}

function buildSearchDocuments(locale: string): SearchProduct[] {
  return products
    .map((p) => {
      const translation = p.translations?.[locale as Locale] ?? p.defaultTranslation
      const minVial = findCheapestVial(p)
      if (!minVial) return null
      const stock = totalStock(p)

      return {
        id: `${p.slug}-${locale}`,
        slug: p.slug,
        name: translation.name,
        tagline: translation.tagline,
        description: translation.description,
        category: p.category,
        purityPercent: p.purityPercent ?? null,
        minPriceCents: minVial.priceCents,
        casNumber: p.casNumber ?? null,
        inStock: stock > 0,
        batchCode: p.latestBatch?.code ?? null,
        locale,
      } as SearchProduct | null
    })
    .filter((doc): doc is SearchProduct => doc !== null)
}

export async function indexProducts() {
  const client = getClient()
  if (!client) {
    logger.warn("[search] Meilisearch not configured — skipping indexing")
    return
  }

  const index = client.index("products")

  // Configure searchable attributes
  await index.updateSettings({
    searchableAttributes: ["name", "tagline", "description", "casNumber", "category", "batchCode"],
    filterableAttributes: ["category", "inStock", "locale", "purityPercent", "minPriceCents"],
    sortableAttributes: ["minPriceCents", "purityPercent"],
    localizedAttributes: [
      {
        attributePatterns: ["name", "tagline", "description"],
        locales: ["en", "fi", "de", "sv", "nl"],
      },
    ],
  })

  // Index products for all locales
  const locales = ["en", "fi", "de", "sv", "nl"]
  const allDocs = locales.flatMap((locale) => buildSearchDocuments(locale))

  await index.addDocuments(allDocs)
  logger.info(
    `[search] Indexed ${allDocs.length} product documents across ${locales.length} locales`,
  )
}

export async function searchProducts(
  query: string,
  options: {
    locale?: string
    category?: string
    inStock?: boolean
    minPrice?: number
    maxPrice?: number
    sort?: string
    limit?: number
    offset?: number
  } = {},
) {
  const client = getClient()

  // Fallback to in-memory search if Meilisearch is not configured
  if (!client) {
    return inMemorySearch(query, options)
  }

  const index = client.index("products")
  const filters: string[] = []

  if (options.locale && isSafeLocale(options.locale)) {
    filters.push(`locale = "${options.locale}"`)
  }
  if (options.category && isSafeFilterValue(options.category)) {
    filters.push(`category = "${options.category}"`)
  }
  if (options.inStock !== undefined) filters.push(`inStock = ${options.inStock}`)
  // Use `!== undefined` rather than truthiness — `minPrice = 0` would
  // otherwise be silently dropped.
  if (options.minPrice !== undefined && Number.isFinite(options.minPrice)) {
    filters.push(`minPriceCents >= ${Math.max(0, Math.trunc(options.minPrice * 100))}`)
  }
  if (options.maxPrice !== undefined && Number.isFinite(options.maxPrice)) {
    filters.push(`minPriceCents <= ${Math.max(0, Math.trunc(options.maxPrice * 100))}`)
  }

  const sort = options.sort && ALLOWED_SORTS.includes(options.sort) ? [options.sort] : undefined

  const result = await index.search<SearchProduct>(query, {
    filter: filters.length > 0 ? filters.join(" AND ") : undefined,
    sort,
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
    facets: ["category", "inStock"],
  })

  return {
    hits: result.hits,
    total: result.estimatedTotalHits ?? 0,
    facets: result.facetDistribution ?? {},
    processingTime: result.processingTimeMs,
  }
}

function inMemorySearch(
  query: string,
  options: {
    locale?: string
    category?: string
    inStock?: boolean
    minPrice?: number
    maxPrice?: number
    sort?: string
    limit?: number
  } = {},
) {
  // Search the requested locale first, but always fall back to the English
  // document so users with a non-English locale still get hits when a query
  // only matches English copy (e.g. searching an English CAS or peptide name
  // while the storefront is in German).
  const locales = options.locale ? [options.locale, "en"] : ["en"]
  const seen = new Set<string>()
  const docs: SearchProduct[] = []
  for (const locale of locales) {
    for (const doc of buildSearchDocuments(locale)) {
      if (seen.has(doc.slug)) continue
      seen.add(doc.slug)
      docs.push(doc)
    }
  }

  // Locale-aware normalization: strip diacritics so Finnish "metabolia" /
  // Swedish "receptorsignalering" match even with imperfect inputs.
  const q = query.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim()
  const tokens = q.split(/\s+/).filter(Boolean)

  const tokensMatch = (haystack: string): boolean => {
    if (tokens.length === 0) return true
    const normalized = haystack.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    return tokens.every((token) => normalized.includes(token))
  }

  let results = docs.filter(
    (d) =>
      tokensMatch(d.name) ||
      tokensMatch(d.tagline) ||
      tokensMatch(d.description) ||
      (d.casNumber ? tokensMatch(d.casNumber) : false) ||
      tokensMatch(d.category) ||
      (d.batchCode ? tokensMatch(d.batchCode) : false),
  )

  if (options.locale) results = results.filter((d) => d.locale === options.locale)
  if (options.category) results = results.filter((d) => d.category === options.category)
  if (options.inStock !== undefined) results = results.filter((d) => d.inStock === options.inStock)
  if (options.minPrice !== undefined && Number.isFinite(options.minPrice)) {
    const cents = Math.max(0, Math.trunc(options.minPrice * 100))
    results = results.filter((d) => d.minPriceCents >= cents)
  }
  if (options.maxPrice !== undefined && Number.isFinite(options.maxPrice)) {
    const cents = Math.max(0, Math.trunc(options.maxPrice * 100))
    results = results.filter((d) => d.minPriceCents <= cents)
  }
  if (options.sort === "minPriceCents:asc")
    results = [...results].sort((a, b) => a.minPriceCents - b.minPriceCents)
  else if (options.sort === "minPriceCents:desc")
    results = [...results].sort((a, b) => b.minPriceCents - a.minPriceCents)
  else if (options.sort === "purityPercent:desc")
    results = [...results].sort((a, b) => (b.purityPercent ?? 0) - (a.purityPercent ?? 0))

  return {
    hits: results.slice(0, options.limit ?? 20),
    total: results.length,
    facets: {},
    processingTime: 0,
  }
}
