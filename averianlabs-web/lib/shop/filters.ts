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
  inStock: true,
  quoteOnly: false,
  purityMin: 95,
  sort: "newest",
}

export function parseFiltersFromSearch(params: URLSearchParams): ShopFilters {
  return {
    category: params.get("category")?.split(",").filter(Boolean) ?? [],
    inStock: params.get("inStock") !== "false",
    quoteOnly: params.get("quoteOnly") === "true",
    purityMin: Number(params.get("purityMin") ?? 95),
    sort: (params.get("sort") as SortOption) ?? "newest",
  }
}

export function serializeFilters(filters: ShopFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.category.length > 0) p.set("category", filters.category.join(","))
  if (!filters.inStock) p.set("inStock", "false")
  if (filters.quoteOnly) p.set("quoteOnly", "true")
  if (filters.purityMin !== 95) p.set("purityMin", String(filters.purityMin))
  if (filters.sort !== "newest") p.set("sort", filters.sort)
  return p
}
