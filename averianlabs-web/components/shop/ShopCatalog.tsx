"use client"

import { ProductCard } from "@/components/product/ProductCard"
import { RecentlyViewed } from "@/components/product/RecentlyViewed"
import { ShopFilterSidebar } from "@/components/product/ShopFilterSidebar"
import { ShopToolbar } from "@/components/product/ShopToolbar"
import { TrustStrip } from "@/components/product/TrustStrip"
import { Badge } from "@/components/ui/Badge"
import { products } from "@/lib/products/data"
import type { Locale } from "@/lib/products/types"
import { type ShopFilters, defaultFilters, parseFiltersFromSearch } from "@/lib/shop/filters"
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
  const t = useTranslations("shop")
  const sp = useSearchParams()
  const params = new URLSearchParams(sp?.toString() ?? "")
  const filters: ShopFilters = { ...defaultFilters, ...parseFiltersFromSearch(params) }

  let filtered = products
  if (filters.category.length > 0) {
    filtered = filtered.filter((p) => filters.category.includes(p.category))
  }
  if (filters.inStock) {
    filtered = filtered.filter((p) => p.vials.some((v) => v.stockQty > 0))
  }
  if (filters.quoteOnly) {
    filtered = filtered.filter((p) => p.vials.some((v) => v.contactOnly || v.priceCents === 0))
  }
  filtered = filtered.filter((p) => !p.purityPercent || p.purityPercent >= filters.purityMin)

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
        return a.defaultTranslation.name.localeCompare(b.defaultTranslation.name)
      case "purity-desc":
        return (b.purityPercent ?? 0) - (a.purityPercent ?? 0)
      default:
        return 0
    }
  })

  const view = (params.get("view") as "grid" | "3d" | "list") ?? "grid"
  const counts: Record<string, number> = {}
  for (const p of products) {
    counts[p.category] = (counts[p.category] ?? 0) + 1
  }

  const activeFilterCount =
    filters.category.length + (filters.purityMin !== 95 ? 1 : 0) + (filters.quoteOnly ? 1 : 0)

  return (
    <>
      <Badge tone="muted" className="mb-6 self-start">
        {t("resultsCount", { count: filtered.length })}
      </Badge>

      <ShopToolbar
        initialView={view}
        locale={locale}
        filters={filters}
        activeFilterCount={activeFilterCount}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <ShopFilterSidebar initial={filters} counts={counts} />

        <div>
          {filtered.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-16 text-center">
              <p className="font-display text-lg">{t("empty")}</p>
              <p className="mt-2 text-sm text-ink-muted">
                Try clearing some filters or browsing all products.
              </p>
            </div>
          ) : view === "3d" ? (
            <Shop3DCarousel products={filtered} locale={locale} />
          ) : view === "list" ? (
            <div className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
              {filtered.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale as Locale} variant="list" />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.slug} product={p} locale={locale as Locale} />
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
