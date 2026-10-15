"use client"

import type { ShopFilters } from "@/lib/shop/filters"
import { cn } from "@/lib/utils/cn"
import { Box, Filter as FilterIcon, GitCompare, LayoutGrid, List, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

interface ShopToolbarProps {
  initialView: "grid" | "3d" | "list"
  initialCategory?: string
  locale: string
  filters: ShopFilters
  activeFilterCount: number
}

export function ShopToolbar({ initialView, locale, filters, activeFilterCount }: ShopToolbarProps) {
  const t = useTranslations("shop")
  const r = useTranslations("research")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams?.toString())
    if (value === null || value === "") params.delete(key)
    else params.set(key, value)
    router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`, {
      scroll: false,
    })
  }

  const chips = [
    ...(searchParams?.get("q")
      ? [{ key: "q", label: searchParams.get("q")!, onRemove: () => update("q", null) }]
      : []),
    ...(filters.inStock
      ? [{ key: "stock", label: t("inStock"), onRemove: () => update("inStock", null) }]
      : []),
    ...(filters.materialType !== "all"
      ? [
          {
            key: "type",
            label: r(`types.${filters.materialType}` as never),
            onRemove: () => update("type", null),
          },
        ]
      : []),
    ...(filters.hasDocuments
      ? [{ key: "documents", label: r("withDocuments"), onRemove: () => update("documents", null) }]
      : []),
    ...filters.category.map((c) => ({
      key: `category.${c}`,
      label: r(`categories.${c}`),
      onRemove: () => update("category", filters.category.filter((x) => x !== c).join(",") || null),
    })),
    ...(filters.purityMin !== 0
      ? [
          {
            key: "purity",
            label: `≥ ${new Intl.NumberFormat(locale).format(filters.purityMin)}% HPLC`,
            onRemove: () => update("purityMin", null),
          },
        ]
      : []),
    ...(filters.quoteOnly
      ? [{ key: "quote", label: r("quote"), onRemove: () => update("quoteOnly", null) }]
      : []),
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const value = new FormData(e.currentTarget).get("q")
            update("q", typeof value === "string" ? value : null)
          }}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3"
        >
          <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          <input
            key={searchParams?.get("q") ?? ""}
            name="q"
            type="search"
            defaultValue={searchParams?.get("q") ?? ""}
            aria-label={r("searchPlaceholder")}
            placeholder={r("searchPlaceholder")}
            className="h-11 min-w-0 flex-1 bg-transparent text-base sm:text-sm outline-none"
          />
          <button type="submit" className="min-h-11 shrink-0 text-sm font-medium text-accent">
            {t("search")}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${locale}/compare`}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 text-base sm:text-sm text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <GitCompare className="h-4 w-4" />
            {r("compare")}
          </Link>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("averianlabs:toggle-filters"))}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 text-base sm:text-sm hover:bg-surface-2 lg:hidden"
          >
            <FilterIcon className="h-4 w-4" />
            {t("filters")}
            {activeFilterCount > 0 ? (
              <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-3xs font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <div className="inline-flex h-10 shrink-0 items-center rounded-[var(--radius)] border border-line bg-surface p-0.5">
            {[
              { v: "grid", icon: LayoutGrid, label: t("viewGrid") },
              { v: "3d", icon: Box, label: t("view3D") },
              { v: "list", icon: List, label: t("viewList") },
            ].map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => update("view", v)}
                aria-label={label}
                aria-pressed={initialView === v}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
                  initialView === v
                    ? "bg-accent text-white"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label={r("materialType")}
          value={filters.materialType}
          onChange={(e) => update("type", e.target.value === "all" ? null : e.target.value)}
          className="h-10 max-w-full rounded-lg border border-line bg-surface px-3 text-base sm:text-sm"
        >
          <option value="all">{r("allTypes")}</option>
          {["peptide", "cosmetic", "reagent", "supplies"].map((type) => (
            <option key={type} value={type}>
              {r(`types.${type}` as never)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={filters.hasDocuments}
            onChange={(e) => update("documents", e.target.checked ? "true" : null)}
          />
          {r("withDocuments")}
        </label>
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
            >
              <span className="text-left">{chip.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="text-xs text-ink-muted hover:text-ink"
          >
            {r("clearAll")}
          </button>
        </div>
      ) : null}
    </div>
  )
}
