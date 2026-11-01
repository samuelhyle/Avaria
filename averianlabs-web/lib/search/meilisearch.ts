import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { defaultVial } from "@/lib/products/selection"
import { storefrontProducts } from "@/lib/products/storefront"
import type { Locale, Product } from "@/lib/products/types"
import { MeiliSearch } from "meilisearch"

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
  skus: string[]
  batchCodes: string[]
  locale: string
}
function documents(products: Product[], locale: string): SearchProduct[] {
  return products.map((p) => {
    const tr = p.translations?.[locale as Locale] ?? p.defaultTranslation
    const vial = defaultVial(p)
    return {
      id: `${p.slug}-${locale}`,
      slug: p.slug,
      name: tr.name,
      tagline: tr.tagline,
      description: tr.description,
      category: p.category,
      purityPercent: p.purityPercent ?? null,
      minPriceCents: vial.priceCents,
      casNumber: p.casNumber ?? null,
      inStock: p.vials.some((v) => v.purchaseMode === "direct" && v.stockQty > 0),
      batchCode: vial.batch?.code ?? null,
      skus: p.vials.map((v) => v.sku),
      batchCodes: p.vials.flatMap((v) => (v.batch ? [v.batch.code] : [])),
      locale,
    }
  })
}
export async function indexProducts() {
  const host = process.env.MEILI_HOST
  const apiKey = process.env.MEILI_API_KEY ?? process.env.MEILI_MASTER_KEY
  if (!host || !apiKey) return
  const client = new MeiliSearch({ host, apiKey, timeout: 5000 })
  const index = client.index("products")
  await index.updateSettings({
    searchableAttributes: ["name", "slug", "skus", "casNumber", "batchCodes"],
    filterableAttributes: ["category", "inStock", "locale"],
    sortableAttributes: ["minPriceCents", "purityPercent"],
  })
  const products = await getStorefrontCatalogue()
  await index.addDocuments(
    ["en", "fi", "sv", "ru"].flatMap((locale) => documents(products, locale)),
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
  // The small catalogue is hydrated on every request so a stale external index cannot advertise stock or batch evidence.
  const locale = ["en", "fi", "sv", "ru"].includes(options.locale ?? "") ? options.locale! : "en"
  const q = query.trim().toLocaleLowerCase(locale)
  let rows = documents(storefrontProducts(await getStorefrontCatalogue()), locale).filter((row) =>
    [row.name, row.slug, row.casNumber ?? "", ...row.skus, ...row.batchCodes].some((value) =>
      value.toLocaleLowerCase(locale).includes(q),
    ),
  )
  if (options.category) rows = rows.filter((row) => row.category === options.category)
  if (options.inStock !== undefined) rows = rows.filter((row) => row.inStock === options.inStock)
  if (options.minPrice !== undefined)
    rows = rows.filter((row) => row.minPriceCents >= options.minPrice! * 100)
  if (options.maxPrice !== undefined)
    rows = rows.filter((row) => row.minPriceCents <= options.maxPrice! * 100)
  if (options.sort === "minPriceCents:asc") rows.sort((a, b) => a.minPriceCents - b.minPriceCents)
  if (options.sort === "minPriceCents:desc") rows.sort((a, b) => b.minPriceCents - a.minPriceCents)
  if (options.sort === "purityPercent:desc")
    rows.sort((a, b) => (b.purityPercent ?? -1) - (a.purityPercent ?? -1))
  const offset = options.offset ?? 0
  return {
    hits: rows.slice(offset, offset + (options.limit ?? 20)),
    total: rows.length,
    facets: {},
    processingTime: 0,
  }
}
