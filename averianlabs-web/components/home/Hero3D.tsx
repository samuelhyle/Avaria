"use client"

import { Hero3DProductCard } from "@/components/home/Hero3DProductCard"
import { Hero3DProductChips } from "@/components/home/Hero3DProductChips"
import { LazyOnVisible } from "@/components/three/LazyOnVisible"
import { PeptideTorusCanvas } from "@/components/three/PeptideTorusCanvas"
import { ThreeDShell } from "@/components/three/ThreeDShell"
import { Skeleton } from "@/components/ui/Skeleton"
import type { Product } from "@/lib/products/types"
import { useState } from "react"

export interface Hero3DProps {
  products: Product[]
  locale: string
}

/**
 * The new homepage hero 3D scene. Wraps the existing `PeptideTorusCanvas`
 * (which already has Bloom postprocessing, auto-rotation, drag controls,
 * and a click-to-select callback) with:
 *
 *   - A `focusedSlug` state shared between the canvas, the chips, and the
 *     HTML overlay card.
 *   - The `Hero3DProductChips` row at the bottom (HTML, real buttons).
 *   - The `Hero3DProductCard` overlay that shows the focused vial's name,
 *     size, price, and a "View →" link. The card is HTML (not in-canvas
 *     text) so it stays crisp, accessible, and outside the GPU pipeline.
 *
 * The whole tree is gated by `LazyOnVisible` so the three.js chunk is not
 * requested during the first paint (PERF-1). When the canvas is far below
 * the fold or `prefers-reduced-motion` is set, `PeptideTorusCanvas` falls
 * back to a static product grid.
 */
export function Hero3D({ products, locale }: Hero3DProps) {
  const initial = products[0]?.slug
  const [focusedSlug, setFocusedSlug] = useState<string | undefined>(initial)

  const focused = products.find((p) => p.slug === focusedSlug) ?? products[0]

  return (
    <div className="relative h-[420px] w-full sm:h-[520px] lg:h-[640px]">
      <LazyOnVisible
        rootMargin="200px"
        fallback={<Skeleton className="h-full w-full rounded-[var(--radius-xl)]" />}
      >
        <ThreeDShell className="h-full w-full" size="default">
          <PeptideTorusCanvas products={products} onSelect={(p) => setFocusedSlug(p.slug)} />
        </ThreeDShell>
      </LazyOnVisible>

      {/* HTML overlay card — positioned in the lower right of the canvas.
          Updates whenever the focused product changes. */}
      {focused ? <Hero3DProductCard key={focused.slug} product={focused} locale={locale} /> : null}

      {/* Chip row — bottom of the hero. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 px-4 lg:bottom-4 lg:px-6">
        <div className="pointer-events-auto">
          <Hero3DProductChips
            products={products}
            focusedSlug={focusedSlug}
            onFocus={(slug) => setFocusedSlug(slug)}
            locale={locale}
          />
        </div>
      </div>
    </div>
  )
}
