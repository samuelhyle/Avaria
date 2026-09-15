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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams?.toString())
    if (value === null || value === "") params.delete(key)
    else params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("averianlabs:open-search"))
  }

  const chips = [
    ...filters.category.map((c) => ({
      key: `category.${c}`,
      label: c,
      onRemove: () => update("category", filters.category.filter((x) => x !== c).join(",") || null),
    })),
    ...(filters.purityMin !== 95
      ? [
          {
            key: "purity",
            label: `≥ ${filters.purityMin}% purity`,
            onRemove: () => update("purityMin", null),
          },
        ]
      : []),
    ...(filters.quoteOnly
      ? [{ key: "quote", label: "Quote only", onRemove: () => update("quoteOnly", null) }]
      : []),
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={openSearch}
          className="flex items-center gap-2 flex-1 rounded-[var(--radius)] border border-line bg-surface-2 px-3 text-left h-10"
        >
          <Search className="h-4 w-4 text-ink-subtle" />
          <span className="text-sm text-ink-subtle">{t("search")}</span>
          <span className="ml-auto hidden font-mono text-3xs text-ink-subtle sm:inline">⌘K</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/compare`}
            className="hidden md:inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <GitCompare className="h-4 w-4" />
            Compare
          </Link>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("averianlabs:toggle-filters"))}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 text-sm hover:bg-surface-2 lg:hidden"
          >
            <FilterIcon className="h-4 w-4" />
            {t("filters")}
            {activeFilterCount > 0 ? (
              <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-3xs font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <div className="inline-flex h-10 items-center rounded-[var(--radius)] border border-line bg-surface p-0.5">
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

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs hover:border-danger/40 hover:bg-danger-soft hover:text-danger"
            >
              <span className="capitalize">{chip.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="text-xs text-ink-muted hover:text-ink"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  )
}
