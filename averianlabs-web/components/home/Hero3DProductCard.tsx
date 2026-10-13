"use client"

import type { Locale, Product } from "@/lib/products/types"
import { formatCurrency } from "@/lib/utils/format"
import { ArrowUpRight, FlaskConical } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

export interface Hero3DProductCardProps {
  product: Product
  locale: string
}

/**
 * The HTML overlay that anchors the focused vial's name, size, price, and
 * a "View →" link. Sits on the right edge of the hero, vertically centered,
 * with a small notch/tab on the left edge that visually "connects" it to
 * the 3D scene — like a museum label beside a specimen.
 *
 * Why HTML and not in-canvas text: sharpness at any zoom, accessible
 * (screen readers pick it up), no GPU cost.
 */
export function Hero3DProductCard({ product, locale }: Hero3DProductCardProps) {
  const t = useTranslations("home")
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const minVial = product.vials.length
    ? product.vials.reduce((min, v) => (v.priceCents < min.priceCents ? v : min), product.vials[0]!)
    : undefined

  return (
    <div
      role="group"
      aria-label={translation.name}
      className="absolute right-4 top-1/2 z-10 w-[280px] -translate-y-1/2 animate-[fadeIn_220ms_ease-out] sm:right-6 lg:right-8"
    >
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface/95 shadow-2xl backdrop-blur-md">
        {/* Notch on the left edge — visually connects the card to the canvas. */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 hidden h-12 w-1 -translate-y-1/2 rounded-r-full bg-accent sm:block"
        />

        <div className="border-b border-line px-5 pb-3 pt-4">
          <div className="flex items-center gap-2 font-mono text-2xs uppercase tracking-wider text-ink-subtle">
            <FlaskConical className="h-3 w-3" aria-hidden="true" />
            <span>
              {t("heroFrom")}{" "}
              {minVial ? (
                <span className="text-ink">
                  {minVial.sizeValue}
                  {minVial.sizeUnit}
                </span>
              ) : null}
            </span>
          </div>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">
            {translation.name}
          </h2>
          <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{translation.tagline}</p>
        </div>

        {minVial ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-b border-line px-5 py-3 text-xs">
            <dt className="text-ink-subtle">SKU</dt>
            <dd className="text-right font-mono text-ink">{minVial.sku}</dd>
            <dt className="text-ink-subtle">HPLC</dt>
            <dd className="text-right font-mono text-ink">
              {product.latestBatch && product.latestBatch.hplcPurity > 0
                ? `${product.latestBatch.hplcPurity.toFixed(1)}%`
                : "—"}
            </dd>
            <dt className="text-ink-subtle">{t("heroFrom")}</dt>
            <dd className="text-right font-mono text-ink">
              {minVial.sizeValue}
              {minVial.sizeUnit}
            </dd>
          </dl>
        ) : null}

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex flex-col">
            <span className="font-mono text-2xs uppercase tracking-wider text-ink-subtle">
              {t("heroFrom")}
            </span>
            <span className="font-display text-2xl font-semibold tabular-nums text-ink">
              {minVial ? formatCurrency(minVial.priceCents, "EUR", locale) : "—"}
            </span>
          </div>
          <Link
            href={`/${locale}/shop/${product.slug}`}
            prefetch={false}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-2xs font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            {t("heroProductView")}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
