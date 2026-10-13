export type SortOption = "newest" | "price-asc" | "price-desc" | "name" | "purity-desc"
export type StockFilter = "all" | "in-stock" | "low-stock" | "quote-only"

export interface ShopFilters {
  category: string[]
  inStock: boolean
  quoteOnly: boolean
  purityMin: number
  sort: SortOption
}

export const defaultFilters: ShopFilters = {
  category: [],
  inStock: false,
  quoteOnly: false,
  purityMin: 0,
  sort: "newest",
}

export function parseFiltersFromSearch(params: URLSearchParams): ShopFilters {
  const categories = [
    "metabolic",
    "recovery",
    "cognitive",
    "longevity",
    "cosmetic",
    "blend",
    "supplies",
  ]
  const sorts: SortOption[] = ["newest", "price-asc", "price-desc", "name", "purity-desc"]
  const purity = Number(params.get("purityMin") ?? 0)
  const sort = params.get("sort")
  return {
    category: [
      ...new Set(
        params
          .get("category")
          ?.split(",")
          .filter((value) => categories.includes(value)) ?? [],
      ),
    ],
    inStock: params.get("inStock") === "true",
    quoteOnly: params.get("quoteOnly") === "true",
    purityMin: Number.isFinite(purity) ? Math.max(0, Math.min(100, purity)) : 0,
    sort: sorts.includes(sort as SortOption) ? (sort as SortOption) : "newest",
  }
}

export function serializeFilters(filters: ShopFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.category.length > 0) p.set("category", filters.category.join(","))
  if (filters.inStock) p.set("inStock", "true")
  if (filters.quoteOnly) p.set("quoteOnly", "true")
  if (filters.purityMin !== 0) p.set("purityMin", String(filters.purityMin))
  if (filters.sort !== "newest") p.set("sort", filters.sort)
  return p
}
