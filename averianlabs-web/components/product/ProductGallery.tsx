"use client"

import { VialGraphic, VialGraphicSkeleton } from "@/components/product/VialGraphic"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { defaultVial } from "@/lib/products/selection"
import type { Locale, Product } from "@/lib/products/types"
import { formatSize } from "@/lib/utils/format"
import { useLocale, useTranslations } from "next-intl"
import dynamic from "next/dynamic"
import { useState } from "react"

const ProductVialScene = dynamic(
  () => import("@/components/three/ProductVialScene").then((module) => module.ProductVialScene),
  { ssr: false, loading: () => <VialGraphicSkeleton className="mx-auto h-48 w-28" /> },
)

export function ProductGallery({
  product,
  selectedSku,
}: { product: Product; selectedSku?: string }) {
  const t = useTranslations("research")
  const locale = useLocale()
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const selected = product.vials.find((vial) => vial.sku === selectedSku) ?? defaultVial(product)
  const [threeD, setThreeD] = useState(false)
  const reducedMotion = useReducedMotion()
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative flex h-64 items-center justify-center bg-surface-2 sm:h-80">
        {threeD ? (
          <ProductVialScene
            name={translation.name}
            sku={selected?.sku ?? ""}
            reducedMotion={reducedMotion}
          />
        ) : (
          <VialGraphic className="h-48 w-32" />
        )}
      </div>
      <figcaption className="space-y-3 border-t border-line p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{translation.name}</p>
            {selected ? (
              <p className="mt-1 break-words font-mono text-xs text-ink-muted">
                {selected.sku} · {formatSize(selected, locale)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-pressed={threeD}
            onClick={() => setThreeD((value) => !value)}
            className="min-h-10 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink hover:border-accent"
          >
            {t(threeD ? "close3d" : "optional3d")}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-ink-muted">{t("threeDNotice")}</p>
      </figcaption>
    </figure>
  )
}
