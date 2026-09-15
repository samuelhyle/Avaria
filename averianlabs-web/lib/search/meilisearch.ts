import { products } from "@/lib/products/data"
import type { Locale } from "@/lib/products/types"
import { MeiliSearch } from "meilisearch"

const MEILI_HOST = process.env.MEILI_HOST
// Support both the documented name and the legacy MASTER/SEARCH aliases.
const MEILI_KEY =
  process.env.MEILI_API_KEY ?? process.env.MEILI_MASTER_KEY ?? process.env.MEILI_SEARCH_KEY

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
  return products.map((p) => {
    const translation = p.translations?.[locale as Locale] ?? p.defaultTranslation
    const minVial = p.vials.reduce(
      (min, v) => (v.priceCents < min.priceCents ? v : min),
      p.vials[0]!,
    )
    const totalStock = p.vials.reduce((s, v) => s + v.stockQty, 0)

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
      inStock: totalStock > 0,
      batchCode: p.latestBatch?.code ?? null,
      locale,
    }
  })
}

export async function indexProducts() {
  const client = getClient()
  if (!client) {
    console.warn("[search] Meilisearch not configured — skipping indexing")
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
  console.log(
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
  if (options.minPrice && Number.isFinite(options.minPrice)) {
    filters.push(`minPriceCents >= ${Math.max(0, Math.trunc(options.minPrice * 100))}`)
  }
  if (options.maxPrice && Number.isFinite(options.maxPrice)) {
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
    limit?: number
  } = {},
) {
  const locale = options.locale ?? "en"
  const docs = buildSearchDocuments(locale)
  const q = query.toLowerCase()

  let results = docs.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.tagline.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.casNumber?.includes(q) ||
      d.category.toLowerCase().includes(q),
  )

  if (options.category) results = results.filter((d) => d.category === options.category)
  if (options.inStock !== undefined) results = results.filter((d) => d.inStock === options.inStock)

  return {
    hits: results.slice(0, options.limit ?? 20),
    total: results.length,
    facets: {},
    processingTime: 0,
  }
}
