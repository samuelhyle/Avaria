"use client"

import { useOverlay } from "@/lib/hooks/use-overlay"
import { CATEGORIES as CATEGORY_META } from "@/lib/products/categories"
import type { ShopFilters, SortOption } from "@/lib/shop/filters"
import { cn } from "@/lib/utils/cn"
import { SlidersHorizontal, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type CSSProperties, useCallback, useEffect, useState } from "react"

interface ShopFilterSidebarProps {
  initial: ShopFilters
  counts: Record<string, number>
}

const SORT_OPTIONS: SortOption[] = ["newest", "price-asc", "price-desc", "name", "purity-desc"]

function FilterContent({
  initial,
  counts,
  onClose,
}: {
  initial: ShopFilters
  counts: Record<string, number>
  onClose?: () => void
}) {
  const t = useTranslations("shop")
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const sortLabels: Record<SortOption, string> = {
    newest: t("sortNewest"),
    "price-asc": t("sortPriceAsc"),
    "price-desc": t("sortPriceDesc"),
    name: t("sortName"),
    "purity-desc": t("sortPurityDesc"),
  }

  const update = useCallback(
    (next: Partial<ShopFilters>) => {
      const merged = { ...initial, ...next }
      const p = new URLSearchParams(sp?.toString())
      if (merged.category.length > 0) p.set("category", merged.category.join(","))
      else p.delete("category")
      if (!merged.inStock) p.set("inStock", "false")
      else p.delete("inStock")
      if (merged.quoteOnly) p.set("quoteOnly", "true")
      else p.delete("quoteOnly")
      if (merged.purityMin !== 95) p.set("purityMin", String(merged.purityMin))
      else p.delete("purityMin")
      if (merged.sort !== "newest") p.set("sort", merged.sort)
      else p.delete("sort")
      p.delete("view")
      router.push(`${pathname}?${p.toString()}`)
    },
    [initial, sp, pathname, router],
  )

  const toggleCategory = (slug: string) => {
    const next = initial.category.includes(slug)
      ? initial.category.filter((c) => c !== slug)
      : [...initial.category, slug]
    update({ category: next })
  }

  const clearAll = () => {
    router.push(pathname)
    onClose?.()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          {t("filters")}
        </h3>
        <button type="button" onClick={clearAll} className="text-xs text-ink-muted hover:text-ink">
          {t("clearAll")}
        </button>
      </div>

      <div>
        <h4 className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
          {t("category")}
        </h4>
        <ul className="mt-3 space-y-1">
          {CATEGORY_META.map(({ slug, hue }) => {
            const checked = initial.category.includes(slug)
            const count = counts[slug] ?? 0
            return (
              <li key={slug}>
                <button
                  type="button"
                  onClick={() => toggleCategory(slug)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius)] px-2 py-1.5 text-sm transition-colors",
                    checked
                      ? "bg-accent-soft text-accent-ink"
                      : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      checked ? "border-accent bg-accent" : "border-line bg-surface",
                    )}
                  >
                    {checked ? (
                      <svg viewBox="0 0 16 16" className="h-3 w-3 text-white" aria-hidden="true">
                        <path
                          d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
                          fill="currentColor"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <span
                    className="hue-dot h-2 w-2 rounded-full"
                    style={{ "--cat-hue": hue } as CSSProperties}
                  />
                  <span className="flex-1 text-left capitalize">{slug}</span>
                  <span className="font-mono text-3xs text-ink-subtle">{count}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="border-t border-line pt-5">
        <h4 className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
          {t("purity")}
        </h4>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono">{initial.purityMin}%</span>
            <span className="text-ink-subtle">min HPLC</span>
          </div>
          <input
            type="range"
            min={95}
            max={100}
            step={0.1}
            value={initial.purityMin}
            onChange={(e) => update({ purityMin: Number(e.target.value) })}
            aria-label={t("purity")}
            className="mt-2 w-full accent-accent"
          />
        </div>
      </div>

      <div className="border-t border-line pt-5 space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={initial.inStock}
            onChange={(e) => update({ inStock: e.target.checked })}
            className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
          />
          <span>{t("inStock")}</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={initial.quoteOnly}
            onChange={(e) => update({ quoteOnly: e.target.checked })}
            className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
          />
          <span>{t("quoteOnly")}</span>
        </label>
      </div>

      <div className="border-t border-line pt-5">
        <h4 className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
          {t("sort")}
        </h4>
        <select
          value={initial.sort}
          onChange={(e) => update({ sort: e.target.value as SortOption })}
          aria-label={t("sort")}
          className="mt-2 h-10 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-sm focus:outline-none focus:border-accent"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {sortLabels[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function ShopFilterSidebar({ initial, counts }: ShopFilterSidebarProps) {
  const t = useTranslations("shop")
  const tCommon = useTranslations("common")
  const [mobileOpen, setMobileOpen] = useState(false)
  const containerRef = useOverlay({ open: mobileOpen, onClose: () => setMobileOpen(false) })

  useEffect(() => {
    const handler = () => setMobileOpen(true)
    window.addEventListener("averianlabs:toggle-filters", handler)
    return () => window.removeEventListener("averianlabs:toggle-filters", handler)
  }, [])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-24 hidden h-fit lg:block">
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-sm">
          <FilterContent initial={initial} counts={counts} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={tCommon("close")}
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <aside
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("filters")}
            className="absolute inset-y-0 left-0 flex w-full max-w-sm flex-col bg-surface shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-lg font-semibold">{t("filters")}</h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={tCommon("close")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterContent
                initial={initial}
                counts={counts}
                onClose={() => setMobileOpen(false)}
              />
            </div>
            <footer className="border-t border-line p-4">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-[var(--radius)] bg-accent py-3 text-sm font-semibold text-on-accent hover:bg-accent-hover"
              >
                {t("applyFilters")}
              </button>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  )
}
