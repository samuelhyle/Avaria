"use client"
import { hasPublishedDocuments } from "@/lib/products/document-status"

import { useCatalogue } from "@/components/product/CatalogueProvider"
import { ProductCard } from "@/components/product/ProductCard"
import { RecentlyViewed } from "@/components/product/RecentlyViewed"
import { ShopFilterSidebar } from "@/components/product/ShopFilterSidebar"
import { ShopToolbar } from "@/components/product/ShopToolbar"
import { TrustStrip } from "@/components/product/TrustStrip"
import { Badge } from "@/components/ui/Badge"
import type { Locale } from "@/lib/products/types"
import {
  type ShopFilters,
  countActiveFilters,
  defaultFilters,
  parseFiltersFromSearch,
} from "@/lib/shop/filters"
import { useTranslations } from "next-intl"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"

// three.js only loads when the visitor switches to the 3D view.
const Shop3DCarousel = dynamic(
  () => import("@/components/three/Shop3DCarousel").then((m) => m.Shop3DCarousel),
  { ssr: false },
)

/**
 * Client catalog island. The `/shop` page shell is static; filtering, sorting
 * and the 3D view are driven by URL search params on the client so the route
 * no longer opts into dynamic rendering.
 */
export function ShopCatalog({ locale }: { locale: string }) {
  const products = useCatalogue()
  const t = useTranslations("shop")
  const r = useTranslations("research")
  const sp = useSearchParams()
  const params = new URLSearchParams(sp?.toString() ?? "")
  const filters: ShopFilters = { ...defaultFilters, ...parseFiltersFromSearch(params) }

  let filtered = products
  if (filters.category.length > 0) {
    filtered = filtered.filter((p) => filters.category.includes(p.category))
  }
  const query = (params.get("q") ?? "").trim().toLocaleLowerCase(locale)
  if (query)
    filtered = filtered.filter((p) =>
      [
        (p.translations?.[locale as Locale] ?? p.defaultTranslation).name,
        p.casNumber ?? "",
        ...p.vials.flatMap((v) => [v.sku, v.batch?.code ?? ""]),
      ].some((value) => value.toLocaleLowerCase(locale).includes(query)),
    )
  if (filters.materialType !== "all")
    filtered = filtered.filter((p) => p.productType === filters.materialType)
  if (filters.hasDocuments) filtered = filtered.filter((p) => hasPublishedDocuments(p, locale))
  if (filters.inStock) {
    filtered = filtered.filter((p) =>
      p.vials.some((v) => v.purchaseMode === "direct" && v.stockQty > 0),
    )
  }
  if (filters.quoteOnly) {
    filtered = filtered.filter((p) => p.vials.some((v) => v.purchaseMode === "quotation"))
  }
  filtered = filtered.filter(
    (p) =>
      filters.purityMin === defaultFilters.purityMin ||
      (p.purityPercent !== undefined && p.purityPercent >= filters.purityMin),
  )

  filtered = [...filtered].sort((a, b) => {
    switch (filters.sort) {
      case "price-asc":
        return (
          Math.min(...a.vials.map((v) => v.priceCents)) -
          Math.min(...b.vials.map((v) => v.priceCents))
        )
      case "price-desc":
        return (
          Math.min(...b.vials.map((v) => v.priceCents)) -
          Math.min(...a.vials.map((v) => v.priceCents))
        )
      case "name":
        return (a.translations?.[locale as Locale] ?? a.defaultTranslation).name.localeCompare(
          (b.translations?.[locale as Locale] ?? b.defaultTranslation).name,
          locale,
        )
      case "purity-desc":
        return (b.purityPercent ?? 0) - (a.purityPercent ?? 0)
      default:
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    }
  })

  const view = params.get("view") === "grid" ? "grid" : params.get("view") === "3d" ? "3d" : "list"
  const counts: Record<string, number> = {}
  for (const p of products) {
    counts[p.category] = (counts[p.category] ?? 0) + 1
  }

  const activeFilterCount = countActiveFilters(filters) + Number(!!query)

  return (
    <>
      <Badge tone="muted" className="mb-4 self-start">
        {t("resultsCount", { count: filtered.length })}
      </Badge>

      <ShopToolbar
        initialView={view}
        locale={locale}
        filters={filters}
        activeFilterCount={activeFilterCount}
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <ShopFilterSidebar
          initial={filters}
          counts={counts}
          hasPurity={products.some((p) => p.purityPercent !== undefined)}
        />

        <div>
          {filtered.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-16 text-center">
              <p className="font-display text-lg">{t("empty")}</p>
              <p className="mt-2 text-sm text-ink-muted">{r("emptyFilters")}</p>
            </div>
          ) : view === "3d" ? (
            <Shop3DCarousel products={filtered} locale={locale} />
          ) : view === "list" ? (
            <div className="grid gap-3">
              {filtered.map((p) => (
                <ProductCard
                  key={p.slug}
                  product={p}
                  locale={locale as Locale}
                  variant="list"
                  headingLevel={2}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale as Locale} headingLevel={2} />
              ))}
            </div>
          )}

          <TrustStrip />

          <RecentlyViewed
            products={products}
            locale={locale as Locale}
            spacing="section"
            showHelper
          />
        </div>
      </div>
    </>
  )
}
