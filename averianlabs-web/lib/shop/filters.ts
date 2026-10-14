export type SortOption = "newest" | "price-asc" | "price-desc" | "name" | "purity-desc"
export type StockFilter = "all" | "in-stock" | "low-stock" | "quote-only"

export interface ShopFilters {
  category: string[]
  inStock: boolean
  quoteOnly: boolean
  purityMin: number
  sort: SortOption
  materialType: string
  hasDocuments: boolean
}

export const defaultFilters: ShopFilters = {
  category: [],
  inStock: false,
  quoteOnly: false,
  purityMin: 0,
  sort: "newest",
  materialType: "all",
  hasDocuments: false,
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
    materialType: ["peptide", "cosmetic", "reagent", "supplies"].includes(params.get("type") ?? "")
      ? params.get("type")!
      : "all",
    hasDocuments: params.get("documents") === "true",
    inStock: params.get("inStock") === "true",
    quoteOnly: params.get("quoteOnly") === "true",
    purityMin: Number.isFinite(purity) ? Math.max(0, Math.min(100, purity)) : 0,
    sort: sorts.includes(sort as SortOption) ? (sort as SortOption) : "newest",
  }
}

export function serializeFilters(filters: ShopFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.category.length > 0) p.set("category", filters.category.join(","))
  if (filters.materialType !== "all") p.set("type", filters.materialType)
  if (filters.hasDocuments) p.set("documents", "true")
  if (filters.inStock) p.set("inStock", "true")
  if (filters.quoteOnly) p.set("quoteOnly", "true")
  if (filters.purityMin !== 0) p.set("purityMin", String(filters.purityMin))
  if (filters.sort !== "newest") p.set("sort", filters.sort)
  return p
}

export function countActiveFilters(filters: ShopFilters) {
  return (
    filters.category.length +
    Number(filters.inStock) +
    Number(filters.quoteOnly) +
    Number(filters.hasDocuments) +
    Number(filters.materialType !== defaultFilters.materialType) +
    Number(filters.purityMin !== defaultFilters.purityMin)
  )
}
