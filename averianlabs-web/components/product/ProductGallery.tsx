"use client"

import { VialGraphic, VialGraphicSkeleton } from "@/components/product/VialGraphic"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import type { Locale, Product } from "@/lib/products/types"
import { useLocale, useTranslations } from "next-intl"
import dynamic from "next/dynamic"
import { useState } from "react"

const ProductVialScene = dynamic(
  () => import("@/components/three/ProductVialScene").then((m) => m.ProductVialScene),
  { ssr: false, loading: () => <VialGraphicSkeleton className="h-64 w-32" /> },
)

export function ProductGallery({ product }: { product: Product }) {
  const t = useTranslations("research")
  const locale = useLocale()
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const [threeD, setThreeD] = useState(false)
  const reducedMotion = useReducedMotion()
  return (
    <div>
      <div className="relative flex h-64 sm:h-80 items-center justify-center overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface-2">
        {threeD ? (
          <ProductVialScene product={product} reducedMotion={reducedMotion} />
        ) : (
          <VialGraphic hue={product.hue} name={translation.name} className="h-48 w-28" />
        )}
        <span className="absolute bottom-4 rounded-full bg-surface px-3 py-1 text-xs text-ink-muted">
          {t("illustration")}
        </span>
      </div>
      <button
        type="button"
        aria-pressed={threeD}
        onClick={() => setThreeD((value) => !value)}
        className="mt-3 rounded-[var(--radius)] border border-line px-4 py-2 text-sm text-ink hover:border-accent"
      >
        {t(threeD ? "close3d" : "optional3d")}
      </button>
    </div>
  )
}
