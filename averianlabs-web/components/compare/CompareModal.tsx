"use client"

import { VialGraphic } from "@/components/product/VialGraphic"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useCompare } from "@/lib/compare/store"
import { hasPublishedDocuments } from "@/lib/products/document-status"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatCurrency, formatPercent, formatSize } from "@/lib/utils/format"
import { ArrowRight, ExternalLink, GitCompare, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useEffect } from "react"

interface CompareModalProps {
  locale: Locale
  products: Product[]
}

/**
 * Side-by-side comparison sheet.
 *
 * Renders the **shortest** spec column on the left and one column per product.
 * ESC closes the sheet.
 */
export function CompareModal({ locale, products }: CompareModalProps) {
  const items = useCompare((s) => s.items)
  const isOpen = useCompare((s) => s.isOpen)
  const close = useCompare((s) => s.close)
  const remove = useCompare((s) => s.remove)
  const t = useTranslations("compare")
  const r = useTranslations("research")
  const open = isOpen && items.length >= 2

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, close])

  if (!open) return null
  const productsBySlug = new Map(products.map((p) => [p.slug, p]))
  const list = items.map((slug) => productsBySlug.get(slug)).filter(Boolean) as Product[]
  if (list.length < 2) return null

  const rows: Array<{ label: string; read: (p: Product) => React.ReactNode }> = [
    {
      label: t("category"),
      read: (p) => <span className="capitalize">{p.category}</span>,
    },
    {
      label: t("compareLabel"),
      read: (p) => (
        <span className="font-mono text-xs">
          {p.vials.map((v) => formatSize(v, locale)).join(" · ")}
        </span>
      ),
    },
    {
      label: t("priceFrom"),
      read: (p) => {
        const buys = p.vials.filter((v) => v.purchaseMode === "direct" && v.priceCents > 0)
        if (buys.length === 0) return <span className="text-ink-muted">{r("quote")}</span>
        const cheapest = buys.reduce((a, b) => (a.priceCents < b.priceCents ? a : b))
        return (
          <span className="font-mono font-semibold tabular-nums">
            {formatCurrency(cheapest.priceCents, "EUR", locale)}
          </span>
        )
      },
    },
    {
      label: t("purity"),
      read: (p) => (
        <span className="font-mono">
          {p.purityPercent !== undefined ? formatPercent(p.purityPercent, locale) : "—"}
        </span>
      ),
    },
    {
      label: r("documents"),
      read: (p) =>
        hasPublishedDocuments(p, locale) ? (
          <Badge tone="success">{r("documentAvailable")}</Badge>
        ) : (
          <Badge tone="muted">{r("noDocuments")}</Badge>
        ),
    },
    {
      label: t("molarMass"),
      read: (p) =>
        p.molecularWeight ? (
          <span className="font-mono text-xs">{p.molecularWeight.toFixed(2)}</span>
        ) : (
          <span className="text-ink-subtle">—</span>
        ),
    },
  ]

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t("close")}
        onClick={close}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-in fade-in-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("compareLabel")}
        className="absolute inset-x-2 top-2 mx-auto flex max-h-[calc(100vh-16px)] max-w-6xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-lg)] sm:inset-x-6 sm:top-6 lg:top-10 animate-in slide-in-from-bottom fade-in-0"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line bg-surface-2/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent">
              <GitCompare className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-lg font-display font-semibold tracking-tight">
                {t("compareLabel")}
              </h2>
              <p className="text-xs text-ink-muted">{t("selected", { count: list.length })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" onClick={() => useCompare.getState().clear()}>
              {r("clearAll")}
            </Button>
            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div
            className="grid border-b border-line bg-surface"
            style={{ gridTemplateColumns: `200px repeat(${list.length}, minmax(0, 1fr))` }}
          >
            <div className="border-r border-line p-4 text-xs font-medium uppercase tracking-wider text-ink-subtle">
              {t("material")}
            </div>
            {list.map((p) => (
              <div key={p.slug} className="group relative border-r border-line p-4 last:border-r-0">
                <button
                  type="button"
                  onClick={() => remove(p.slug)}
                  aria-label={`${r("remove")}: ${(p.translations?.[locale] ?? p.defaultTranslation).name}`}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-2 hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex flex-col items-start gap-2">
                  <div
                    aria-hidden
                    className="hue-tile flex h-20 w-16 items-end justify-center rounded-[var(--radius)]"
                    style={{ "--cat-hue": p.hue } as React.CSSProperties}
                  >
                    <VialGraphic hue={p.hue} showLabel={false} className="h-20 w-12" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/${locale}/shop/${p.slug}`}
                      className="block truncate text-sm font-semibold tracking-tight hover:text-accent"
                    >
                      {(p.translations?.[locale] ?? p.defaultTranslation).name}
                    </Link>
                    <p className="mt-1 break-all font-mono text-2xs text-ink-muted">
                      {p.vials[0]?.sku}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/shop/${p.slug}`}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                  >
                    {t("viewProduct")}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {rows.map((row, i) => (
            <div
              key={row.label}
              className={cn(
                "grid border-b border-line last:border-b-0",
                i % 2 === 0 ? "bg-surface" : "bg-surface-2/30",
              )}
              style={{ gridTemplateColumns: `200px repeat(${list.length}, minmax(0, 1fr))` }}
            >
              <div className="border-r border-line px-4 py-3 text-xs font-medium uppercase tracking-wider text-ink-subtle">
                {row.label}
              </div>
              {list.map((p) => (
                <div
                  key={p.slug}
                  className="border-r border-line px-4 py-3 text-sm last:border-r-0"
                >
                  {row.read(p)}
                </div>
              ))}
            </div>
          ))}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/50 px-5 py-4">
          <p className="text-xs text-ink-muted">{t("footerHint")}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={close}>
              {t("close")}
            </Button>
            <Button asChild size="md">
              <Link href={`/${locale}/shop`}>
                {t("addMore")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
