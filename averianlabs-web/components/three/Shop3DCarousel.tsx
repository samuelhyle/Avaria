"use client"

import { hasPublishedDocuments } from "@/lib/products/document-status"
import { defaultVial } from "@/lib/products/selection"
import type { Locale, Product } from "@/lib/products/types"
import { formatSize } from "@/lib/utils/format"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useState } from "react"
import { ProductVialScene } from "./ProductVialScene"

interface ShopCarouselProps {
  products: Product[]
  locale: Locale | string
  reducedMotion?: boolean
}

/** Optional view shares the exact catalogue variant and never invents stock or pricing. */
export function Shop3DCarousel({ products, locale, reducedMotion }: ShopCarouselProps) {
  const t = useTranslations("shop")
  const r = useTranslations("research")
  const [selectedSlug, setSelectedSlug] = useState(products[0]?.slug)
  const active = products.find((product) => product.slug === selectedSlug) ?? products[0]
  if (!active) return null
  const index = products.indexOf(active)
  const translation = active.translations?.[locale as Locale] ?? active.defaultTranslation
  const variant = defaultVial(active)
  const available =
    variant?.purchaseMode === "direct" && variant.stockQty > 0 && variant.priceCents > 0
  const step = (direction: number) =>
    setSelectedSlug(products[(index + direction + products.length) % products.length]?.slug)
  return (
    <section
      aria-label={t("carouselLabel")}
      className="overflow-hidden rounded-xl border border-line bg-surface"
    >
      <div className="grid md:grid-cols-2">
        <div className="h-80 bg-surface-2 sm:h-96">
          <ProductVialScene
            key={active.slug}
            name={translation.name}
            sku={variant?.sku ?? ""}
            reducedMotion={reducedMotion}
          />
        </div>
        <div className="flex flex-col justify-center p-5 sm:p-6">
          <p className="text-xs text-ink-muted">
            {index + 1} / {products.length} · {r("illustration")}
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">{translation.name}</h3>
          <p className="mt-2 break-words font-mono text-sm text-ink-muted">{variant?.sku}</p>
          <p className="mt-2 text-sm text-ink-muted">
            {active.vials.map((vial) => formatSize(vial, locale)).join(" / ")}
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-3">
              <dt className="text-ink-muted">{r("availability")}</dt>
              <dd>
                {available
                  ? r("available")
                  : variant?.purchaseMode === "quotation"
                    ? r("quote")
                    : r("unavailable")}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-3">
              <dt className="text-ink-muted">{r("documents")}</dt>
              <dd>
                {hasPublishedDocuments(active, locale, variant?.sku)
                  ? r("documentAvailable")
                  : r("noDocuments")}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">{r("threeDNotice")}</p>
          <Link
            href={`/${locale}/shop/${active.slug}`}
            className="mt-5 inline-flex min-h-11 items-center self-start rounded-lg bg-accent px-4 text-sm font-medium text-on-accent"
          >
            {r("product")} →
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm hover:border-accent"
          aria-label={t("carouselPrev")}
          onClick={() => step(-1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t("carouselPrev")}
        </button>
        <div className="flex max-w-full flex-wrap gap-2" aria-label={t("carouselLabel")}>
          {products.map((product, itemIndex) => (
            <button
              key={product.slug}
              type="button"
              aria-pressed={product.slug === active.slug}
              aria-label={t("carouselGoTo", {
                name:
                  product.translations?.[locale as Locale]?.name ?? product.defaultTranslation.name,
              })}
              onClick={() => setSelectedSlug(product.slug)}
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-line px-2 font-mono text-xs aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
            >
              {itemIndex + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm hover:border-accent"
          aria-label={t("carouselNext")}
          onClick={() => step(1)}
        >
          {t("carouselNext")}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  )
}
