"use client"

import { Hero3DProductCard } from "@/components/home/Hero3DProductCard"
import { Hero3DProductChips } from "@/components/home/Hero3DProductChips"
import { VialGraphic } from "@/components/product/VialGraphic"
import { ThreeDShell } from "@/components/three/ThreeDShell"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import type { Product } from "@/lib/products/types"
import { useTranslations } from "next-intl"
import dynamic from "next/dynamic"
import { useState } from "react"

const PeptideTorusCanvas = dynamic(
  () => import("@/components/three/PeptideTorusCanvas").then((module) => module.PeptideTorusCanvas),
  { ssr: false },
)

/**
 * The hero 3-D scene. By default the canvas is *not* active — we render
 * a static `VialGraphic` of the focused product, and the user can opt in
 * to the interactive canvas with a button. This keeps the homepage
 * cheap on first paint (no three.js chunk downloaded for non-curious
 * users) and avoids an animation that some browsers can't keep up with.
 *
 * Layout on mobile (default < sm):
 *   - Static vial image fills the canvas area.
 *   - The "enable 3-D" button sits on top of it.
 *   - The Hero3DProductCard **stacks below** the canvas (not overlaid),
 *     so the chip row at the bottom of the canvas isn't covered.
 * Layout on sm+:
 *   - Same canvas area.
 *   - The Hero3DProductCard **overlays** the right edge, vertically centred,
 *     with a notch on the left that visually connects it to the vial.
 */
export function Hero3D({ products, locale }: { products: Product[]; locale: string }) {
  const t = useTranslations("research")
  const [focusedSlug, setFocusedSlug] = useState(products[0]?.slug)
  const [interactive, setInteractive] = useState(false)
  const reducedMotion = useReducedMotion()
  const focused = products.find((product) => product.slug === focusedSlug) ?? products[0]

  return (
    <div className="relative w-full">
      {/* Canvas area — wraps the 3-D shell + overlay card (sm+) + chip row. */}
      <div className="relative h-[460px] w-full overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface sm:h-[520px] lg:h-[640px]">
        {interactive ? (
          <ThreeDShell className="h-full w-full">
            <PeptideTorusCanvas
              products={products}
              reducedMotion={reducedMotion}
              onSelect={(product) => setFocusedSlug(product.slug)}
            />
          </ThreeDShell>
        ) : focused ? (
          <div
            className="hue-radial flex h-full items-center justify-start p-5 sm:p-8"
            style={{
              background: `radial-gradient(circle at 25% 45%, hsl(${focused.hue} 60% 88%), var(--color-surface))`,
            }}
          >
            <VialGraphic
              hue={focused.hue}
              className="h-64 w-32 sm:h-80 sm:w-40"
              showLabel={false}
            />
          </div>
        ) : null}

        <button
          type="button"
          aria-pressed={interactive}
          onClick={() => setInteractive(!interactive)}
          className="absolute left-4 top-4 z-20 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium"
        >
          {interactive ? t("close3d") : t("optional3d")}
        </button>

        {/* Overlay card (sm+) — right edge, vertically centred, with the
            notch on the left that visually anchors it to the vial. */}
        {focused ? (
          <div className="hidden sm:block">
            <Hero3DProductCard key={focused.slug} product={focused} locale={locale} />
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-4 z-20 px-4">
          <Hero3DProductChips
            products={products}
            focusedSlug={focusedSlug}
            onFocus={setFocusedSlug}
            locale={locale}
          />
        </div>

        {!interactive ? (
          <p className="absolute bottom-16 left-4 text-xs text-ink-muted">{t("illustration")}</p>
        ) : null}
      </div>

      {/* Stacked card on mobile — sits below the canvas so it doesn't fight
          the 3-D scene for the same pixels. */}
      {focused ? (
        <div className="mt-3 sm:hidden">
          <Hero3DProductCard key={focused.slug} product={focused} locale={locale} />
        </div>
      ) : null}
    </div>
  )
}
