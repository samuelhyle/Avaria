"use client"

import { useCompare } from "@/lib/compare/store"
import { cn } from "@/lib/utils/cn"
import { GitCompare, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

export function CompareFloatingBar({ locale }: { locale: string }) {
  const t = useTranslations("compare")
  const items = useCompare((s) => s.items)
  const remove = useCompare((s) => s.remove)
  const clear = useCompare((s) => s.clear)
  const max = useCompare((s) => s.max)

  if (items.length === 0) return null

  return (
    <div
      role="region"
      aria-label={t("barLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 shadow-2xl backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
            <GitCompare className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{t("barTitle", { count: items.length, max })}</p>
            <p className="text-3xs text-ink-muted">{t("barSub")}</p>
          </div>
        </div>
        <div className="ml-2 hidden flex-1 flex-wrap gap-1.5 md:flex">
          {items.map((slug) => (
            <span
              key={slug}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-2xs font-medium"
            >
              {slug}
              <button
                type="button"
                onClick={() => remove(slug)}
                aria-label={t("removeFromCompareA11y", { slug })}
                className="-mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-3 hover:text-danger"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="text-xs text-ink-muted hover:text-danger"
          >
            {t("clear")}
          </button>
          <Link
            href={`/${locale}/compare?${items.map((s) => `slug=${s}`).join("&")}`}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-[var(--radius)] bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover",
              items.length < 2 && "pointer-events-none opacity-50",
            )}
            aria-disabled={items.length < 2}
          >
            {t("compare")}
          </Link>
        </div>
      </div>
    </div>
  )
}
