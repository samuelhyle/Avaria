"use client"

import { cn } from "@/lib/utils/cn"
import { ChevronDown, FileCheck2, Package, Sparkles, TrendingUp } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"

interface QuickFiltersProps {
  /** Active filter set as derived from the URL by the parent catalog. */
  active: { inStock: boolean; quoteOnly: boolean; hasDocuments: boolean }
  className?: string
}

const PILLS = [
  {
    id: "inStock",
    labelKey: "inStock",
    icon: Package,
  },
  {
    id: "hasDocuments",
    labelKey: "documents",
    icon: FileCheck2,
  },
  {
    id: "quoteOnly",
    labelKey: "quoteOnly",
    icon: Sparkles,
  },
] as const

/**
 * One-click quick filters rendered above the catalogue toolbar. Pill state
 * mirrors the same URL search params used by `ShopFilterSidebar`, so toggling
 * here and unchecking the sidebar sync without extra wiring.
 */
export function QuickFilters({ active, className }: QuickFiltersProps) {
  const router = useRouter()
  const sp = useSearchParams()
  const t = useTranslations("shop")

  function toggle(key: "inStock" | "hasDocuments" | "quoteOnly") {
    const params = new URLSearchParams(sp?.toString() ?? "")
    const next = !active[key]
    if (next) params.set(key === "hasDocuments" ? "documents" : key, "true")
    else params.delete(key === "hasDocuments" ? "documents" : key)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div
      role="toolbar"
      aria-label={t("filterQuick")}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-ink-subtle">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden />
        {t("filterQuick")}
      </span>
      {PILLS.map((pill) => {
        const Icon = pill.icon
        const on = active[pill.id as "inStock" | "hasDocuments" | "quoteOnly"]
        return (
          <button
            key={pill.id}
            type="button"
            onClick={() => toggle(pill.id as "inStock" | "hasDocuments" | "quoteOnly")}
            aria-pressed={on}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
              on
                ? "border-accent bg-accent text-on-accent"
                : "border-line bg-surface text-ink hover:border-accent/40",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {t(pill.labelKey as never)}
            {on ? <ChevronDown aria-hidden className="h-3 w-3 rotate-180" /> : null}
          </button>
        )
      })}
    </div>
  )
}
