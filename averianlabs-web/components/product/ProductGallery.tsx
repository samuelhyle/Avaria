"use client"

import { ProductVisual } from "@/components/product/ProductVisual"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { defaultVial } from "@/lib/products/selection"
import type { Locale, Product } from "@/lib/products/types"
import { formatSize } from "@/lib/utils/format"
import { Box, ShieldCheck } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import dynamic from "next/dynamic"
import { useState } from "react"

const ProductVialScene = dynamic(
  () => import("@/components/three/ProductVialScene").then((module) => module.ProductVialScene),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto h-64 w-40 animate-pulse rounded-xl bg-surface-2" aria-hidden />
    ),
  },
)

/**
 * Product media. The default view is the generated product render on a tinted
 * studio stage; the optional 3D view stays available for shoppers who want
 * to inspect the container.
 */
export function ProductGallery({
  product,
  selectedSku,
}: {
  product: Product
  selectedSku?: string
}) {
  const t = useTranslations("research")
  const locale = useLocale()
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const selected = product.vials.find((vial) => vial.sku === selectedSku) ?? defaultVial(product)
  const [threeD, setThreeD] = useState(false)
  const reducedMotion = useReducedMotion()

  return (
    <figure
      style={{ ["--cat-hue" as string]: String(product.hue ?? 184) }}
      className="overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <div className="store-stage relative flex aspect-square items-center justify-center sm:aspect-[4/3]">
        {threeD ? (
          <ProductVialScene
            name={translation.name}
            sku={selected?.sku ?? ""}
            reducedMotion={reducedMotion}
          />
        ) : (
          <ProductVisual
            product={product}
            sku={selected?.sku}
            size="lg"
            className="h-[74%] w-auto"
          />
        )}

        {/* Batch / purity chips */}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.purityPercent ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-2xs font-semibold text-success shadow-sm backdrop-blur">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
              {product.purityPercent}% HPLC
            </span>
          ) : null}
        </div>

        <button
          type="button"
          aria-pressed={threeD}
          onClick={() => setThreeD((value) => !value)}
          className="absolute bottom-4 right-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface/92 px-3.5 py-2 text-xs font-medium text-ink shadow-sm backdrop-blur-md transition-colors hover:border-accent/40 hover:text-accent"
        >
          <Box aria-hidden className="h-3.5 w-3.5" />
          {t(threeD ? "close3d" : "optional3d")}
        </button>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{translation.name}</p>
          {selected ? (
            <p className="mt-0.5 break-words font-mono text-xs text-ink-muted">
              {selected.sku} · {formatSize(selected, locale)}
            </p>
          ) : null}
        </div>
        <p className="text-2xs text-ink-subtle">{t("threeDNotice")}</p>
      </figcaption>
    </figure>
  )
}
