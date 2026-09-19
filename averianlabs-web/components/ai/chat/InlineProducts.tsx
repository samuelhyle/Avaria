"use client"

import { FlaskConical } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"

import { formatCurrency } from "@/lib/utils/format"
import type { ToolTrace } from "./types"

interface ProductCardData {
  slug: string
  name: string
  url: string
  purityPercent: number | null
  fromPriceCents: number | null
}

export function extractProducts(trace?: ToolTrace[], locale?: string): ProductCardData[] {
  if (!trace || trace.length === 0) return []
  const out = new Map<string, ProductCardData>()
  const localePrefix = locale ? `/${locale}` : ""

  const minPrice = (vials: Array<{ priceCents?: number }>): number | null => {
    const prices = vials
      .map((v) => v.priceCents)
      .filter((c): c is number => typeof c === "number" && c > 0)
    return prices.length > 0 ? Math.min(...prices) : null
  }

  for (const t of trace) {
    if (t.result === undefined || t.result === null) continue
    const r = t.result as Record<string, unknown>

    if (t.name === "searchProducts" && Array.isArray(r.results)) {
      for (const item of r.results as Array<Record<string, unknown>>) {
        const slug = typeof item.slug === "string" ? item.slug : null
        const name = typeof item.name === "string" ? item.name : null
        if (!slug || !name) continue
        out.set(slug, {
          slug,
          name,
          // Fall back to a locale-prefixed URL so the link works when the
          // upstream tool forgot to include the locale segment.
          url: typeof item.url === "string" ? item.url : `${localePrefix}/shop/${slug}`,
          purityPercent: typeof item.purityPercent === "number" ? item.purityPercent : null,
          fromPriceCents: Array.isArray(item.vials)
            ? minPrice(item.vials as Array<{ priceCents?: number }>)
            : null,
        })
      }
    } else if (
      t.name === "getProduct" &&
      typeof r.slug === "string" &&
      typeof r.name === "string"
    ) {
      out.set(r.slug, {
        slug: r.slug,
        name: r.name,
        url: typeof r.url === "string" ? r.url : `${localePrefix}/shop/${r.slug}`,
        purityPercent: typeof r.purityPercent === "number" ? r.purityPercent : null,
        fromPriceCents: Array.isArray(r.vials)
          ? minPrice(r.vials as Array<{ priceCents?: number }>)
          : null,
      })
    } else if (t.name === "compareProducts" && Array.isArray(r.products)) {
      for (const item of r.products as Array<Record<string, unknown>>) {
        const slug = typeof item.slug === "string" ? item.slug : null
        const name = typeof item.name === "string" ? item.name : null
        if (!slug || !name) continue
        out.set(slug, {
          slug,
          name,
          url: typeof item.url === "string" ? item.url : `${localePrefix}/shop/${slug}`,
          purityPercent: typeof item.purityPercent === "number" ? item.purityPercent : null,
          fromPriceCents: typeof item.fromPriceCents === "number" ? item.fromPriceCents : null,
        })
      }
    }
  }

  return Array.from(out.values()).slice(0, 4)
}

export function InlineProducts({ products }: { products: ProductCardData[] }) {
  const t = useTranslations("averia")
  const locale = useLocale()
  return (
    <ul className="flex flex-col gap-1.5">
      {products.map((p) => (
        <li key={p.slug}>
          <Link href={p.url} className="block" prefetch={false}>
            <span className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-3 py-2 transition-colors hover:border-accent/40 hover:bg-accent-soft/40">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-ink">{p.name}</span>
                <span className="block text-3xs text-ink-muted">
                  {p.purityPercent !== null ? `${p.purityPercent.toFixed(1)}% HPLC · ` : ""}
                  {p.fromPriceCents !== null ? formatCurrency(p.fromPriceCents, "EUR", locale) : ""}
                </span>
              </span>
              <span className="shrink-0 text-3xs font-medium text-accent">{t("viewProduct")}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
