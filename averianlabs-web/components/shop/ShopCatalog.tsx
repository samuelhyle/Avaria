"use client"
import { hasPublishedDocuments } from "@/lib/products/document-status"

import { useCatalogue } from "@/components/product/CatalogueProvider"
import { ProductCard } from "@/components/product/ProductCard"
import { QuickFilters } from "@/components/product/QuickFilters"
import { QuickViewProvider } from "@/components/product/QuickViewProvider"
import { RecentlyViewed } from "@/components/product/RecentlyViewed"
import { ShopFilterSidebar } from "@/components/product/ShopFilterSidebar"
import { ShopToolbar } from "@/components/product/ShopToolbar"
import { TrustStrip } from "@/components/product/TrustStrip"
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
import { useMemo } from "react"

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
  // `useSearchParams` returns a stable object for the current URL, so the
  // parsed params are stable too. That matters: `filters` is the `initial`
  // prop of `ShopFilterSidebar`, which resets its local selection whenever
  // that object's identity changes. Building the params inside the memo
  // keeps the identity stable across unrelated re-renders.
  const params = useMemo(() => new URLSearchParams(sp?.toString() ?? ""), [sp])
  // `filters` is passed to `ShopFilterSidebar` as its `initial` prop, and the
  // sidebar resets its local selection whenever that identity changes. A new
  // object on every render made the reset fire on every render, discarding
  // in-flight edits and adding a render pass each time. Key the memo on the
  // serialised query string instead.
  const filters: ShopFilters = useMemo(
    () => ({ ...defaultFilters, ...parseFiltersFromSearch(params) }),
    [params],
  )

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

  const view = params.get("view") === "list" ? "list" : params.get("view") === "3d" ? "3d" : "grid"
  const counts: Record<string, number> = {}
  for (const p of products) {
    counts[p.category] = (counts[p.category] ?? 0) + 1
  }

  const activeFilterCount = countActiveFilters(filters) + Number(!!query)

  /**
   * Split the results into what can be bought now and what cannot.
   *
   * A flat list of seventeen materials where fifteen read "Currently
   * unavailable" hides the two that can actually be ordered. Grouping them
   * puts the buyable path first without hiding anything: a researcher still
   * sees the whole catalogue, and still knows a quote can be asked for.
   */
  const isAvailable = (product: (typeof products)[number]) =>
    product.vials.some(
      (vial) => vial.purchaseMode === "direct" && vial.priceCents > 0 && vial.stockQty > 0,
    )
  const available = filtered.filter(isAvailable)
  const unavailable = filtered.filter((product) => !isAvailable(product))

  const renderList = (items: typeof filtered, showAvailability = true) =>
    items.map((p) => (
      <ProductCard
        key={p.slug}
        product={p}
        locale={locale as Locale}
        variant="list"
        headingLevel={2}
        showAvailability={showAvailability}
      />
    ))

  const renderGrid = (items: typeof filtered, showAvailability = true) =>
    items.map((p) => (
      <ProductCard
        key={p.slug}
        product={p}
        locale={locale as Locale}
        headingLevel={2}
        showAvailability={showAvailability}
      />
    ))

  return (
    <>
      <QuickFilters
        active={{
          inStock: filters.inStock,
          quoteOnly: filters.quoteOnly,
          hasDocuments: filters.hasDocuments,
        }}
      />

      <ShopToolbar
        initialView={view}
        locale={locale}
        filters={filters}
        activeFilterCount={activeFilterCount}
      />

      <div className="mt-5 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
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
            <div className="space-y-8">
              {available.length > 0 ? (
                <section aria-labelledby="shop-available-heading">
                  <h2
                    id="shop-available-heading"
                    className="mb-4 flex items-baseline gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-accent"
                  >
                    {t("availableNow")}
                    <span className="font-mono text-ink-subtle">{available.length}</span>
                  </h2>
                  <div className="grid gap-3">{renderList(available)}</div>
                </section>
              ) : null}
              {unavailable.length > 0 ? (
                <section aria-labelledby="shop-unavailable-heading">
                  <h2
                    id="shop-unavailable-heading"
                    className="mb-2 flex items-baseline gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-ink-subtle"
                  >
                    {t("currentlyUnavailable")}
                    <span className="font-mono text-ink-subtle">{unavailable.length}</span>
                  </h2>
                  <p className="mb-4 text-sm text-ink-muted">{t("unavailableHint")}</p>
                  <div className="grid gap-3">{renderList(unavailable)}</div>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="space-y-8">
              {available.length > 0 ? (
                <section aria-labelledby="shop-available-heading">
                  <h2
                    id="shop-available-heading"
                    className="mb-4 flex items-baseline gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-accent"
                  >
                    {t("availableNow")}
                    <span className="font-mono text-ink-subtle">{available.length}</span>
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {renderGrid(available)}
                  </div>
                </section>
              ) : null}
              {unavailable.length > 0 ? (
                <section aria-labelledby="shop-unavailable-heading">
                  <h2
                    id="shop-unavailable-heading"
                    className="mb-2 flex items-baseline gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-ink-subtle"
                  >
                    {t("currentlyUnavailable")}
                    <span className="font-mono text-ink-subtle">{unavailable.length}</span>
                  </h2>
                  <p className="mb-4 text-sm text-ink-muted">{t("unavailableHint")}</p>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {renderGrid(unavailable)}
                  </div>
                </section>
              ) : null}
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

/**
 * Wrapper that mounts the QuickViewProvider once for the whole catalogue.
 * Doing it here means the existing `<ProductCard>` instances don't need a
 * prop-drilled callback.
 */
export function ShopPageCatalog({ locale }: { locale: string }) {
  const products = useCatalogue()
  return (
    <QuickViewProvider locale={locale as Locale} products={products}>
      <ShopCatalog locale={locale} />
    </QuickViewProvider>
  )
}
