"use client"

import { EmptyState } from "@/components/ui/EmptyState"
import { useCompare } from "@/lib/compare/store"
import { defaultVial } from "@/lib/products/selection"
import type { Locale, Product } from "@/lib/products/types"
import { buttonClasses } from "@/lib/ui/button-styles"
import { formatNumber, formatPercent, formatSize } from "@/lib/utils/format"
import { ArrowRight, GitCompareArrows } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

export function CompareTable({ products, locale }: { products: Product[]; locale: string }) {
  const t = useTranslations("research")
  const selected = useCompare((state) => state.items)
  const remove = useCompare((state) => state.toggle)
  const clear = useCompare((state) => state.clear)
  const list = products.filter((product) => selected.includes(product.slug))
  if (!list.length)
    // The empty state was a single sentence in a bare box, on a page that
    // was otherwise empty — so the page read as broken rather than as a
    // page waiting for something. It now says what the page is for and
    // offers the way in.
    return (
      <EmptyState
        icon={GitCompareArrows}
        title={t("compareEmptyTitle")}
        description={t("compareEmptyBody")}
        action={
          <Link
            href={`/${locale}/shop`}
            className={buttonClasses({ variant: "primary", size: "md" })}
          >
            {t("browse")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        }
      />
    )
  const rows: Array<{ label: string; render: (product: Product) => string }> = [
    { label: t("category"), render: (p) => t(`categories.${p.category}`) },
    { label: "CAS", render: (p) => p.casNumber ?? "—" },
    { label: t("formula"), render: (p) => p.molecularFormula ?? "—" },
    {
      label: t("molecularWeight"),
      render: (p) => (p.molecularWeight ? formatNumber(p.molecularWeight, locale) : "—"),
    },
    { label: t("sequence"), render: (p) => p.sequence ?? "—" },
    {
      label: t("purity"),
      render: (p) => (p.purityPercent ? formatPercent(p.purityPercent, locale) : "—"),
    },
    {
      label: t("vialSizes"),
      render: (p) => p.vials.map((vial) => formatSize(vial, locale)).join(" · "),
    },
    { label: t("batch"), render: (p) => defaultVial(p).batch?.code ?? "—" },
    { label: t("storage"), render: (p) => p.storageTemp || t("storagePending") },
  ]
  return (
    <div>
      <button className="mb-5 rounded border border-line p-3" type="button" onClick={clear}>
        {t("clearCompare")}
      </button>
      <div
        className="overflow-x-auto rounded border border-line"
        role="region"
        aria-label={t("compare")}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll the comparison region horizontally.
        tabIndex={0}
      >
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-4 text-left">{t("specifications")}</th>
              {list.map((p) => (
                <th key={p.slug} className="min-w-52 p-4 text-left">
                  <Link href={`/${locale}/shop/${p.slug}`} className="text-accent underline">
                    {(p.translations?.[locale as Locale] ?? p.defaultTranslation).name}
                  </Link>
                  <button
                    type="button"
                    aria-label={`${t("removeCompare")} ${(p.translations?.[locale as Locale] ?? p.defaultTranslation).name}`}
                    className="ml-3 p-2"
                    onClick={() => remove(p.slug)}
                  >
                    ×
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-line">
                <th className="p-4 text-left font-medium">{row.label}</th>
                {list.map((p) => (
                  <td className="max-w-64 break-words p-4" key={p.slug}>
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
