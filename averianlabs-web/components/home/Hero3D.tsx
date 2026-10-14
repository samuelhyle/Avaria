"use client"
import { ProductGallery } from "@/components/product/ProductGallery"
import { VialGraphic } from "@/components/product/VialGraphic"
import { Badge } from "@/components/ui/Badge"
import { hasPublishedDocuments } from "@/lib/products/document-status"
import { defaultVial } from "@/lib/products/selection"
import type { Locale, Product } from "@/lib/products/types"
import { formatSize } from "@/lib/utils/format"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useState } from "react"
export function Hero3D({ products, locale }: { products: Product[]; locale: string }) {
  const r = useTranslations("research")
  const t = useTranslations("home")
  const [expanded, setExpanded] = useState(false)
  const product = products[0]
  if (!product) return null
  const tr = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const vial = defaultVial(product)
  const available = vial.purchaseMode === "direct" && vial.stockQty > 0
  return (
    <section
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
      aria-label={tr.name}
    >
      <div className="border-b border-line px-5 py-4 text-xs text-ink-muted">{r("product")}</div>
      <div className="flex items-center gap-5 p-5 sm:p-6">
        <VialGraphic hue={product.hue} showLabel={false} className="h-36 w-20 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight">{tr.name}</h2>
          <p className="mt-2 break-words font-mono text-xs text-ink-muted">{vial.sku}</p>
          <p className="mt-3 text-sm text-ink-muted">
            {product.vials.map((v) => formatSize(v, locale)).join(" / ")}
          </p>
        </div>
      </div>
      <dl className="divide-y divide-line border-y border-line px-5 text-sm">
        <div className="flex flex-wrap justify-between gap-3 py-3">
          <dt className="text-ink-muted">{r("availability")}</dt>
          <dd>
            <Badge tone={available ? "success" : "muted"}>
              {available
                ? r("available")
                : vial.purchaseMode === "quotation"
                  ? r("quote")
                  : r("unavailable")}
            </Badge>
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-3 py-3">
          <dt className="text-ink-muted">{r("documents")}</dt>
          <dd className="text-xs">
            {hasPublishedDocuments(product, locale) ? r("documentAvailable") : r("noDocuments")}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <span className="text-xs text-ink-muted">{r("illustration")}</span>
        <Link className="text-sm font-medium text-accent" href={`/${locale}/shop/${product.slug}`}>
          {t("heroProductView")} →
        </Link>
      </div>
      <details
        className="border-t border-line px-5 py-3"
        onToggle={(e) => setExpanded(e.currentTarget.open)}
      >
        <summary className="cursor-pointer text-xs text-ink-muted">{r("optional3d")}</summary>
        {expanded && (
          <div className="mt-4">
            <ProductGallery product={product} />
          </div>
        )}
      </details>
    </section>
  )
}
