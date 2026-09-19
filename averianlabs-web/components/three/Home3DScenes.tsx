"use client"

/**
 * Client-only mount points for the home-page 3D scenes.
 *
 * `next/dynamic({ ssr: false })` is only allowed in client components, so
 * the home server component imports these wrappers, which then dynamically
 * load the three.js + drei + postprocessing bundle off the critical path.
 *
 * Each wrapper renders a small static placeholder until the 3D scene has
 * hydrated, so the layout doesn't shift on first paint.
 */

import dynamic from "next/dynamic"

export const HomePeptideTorusHero = dynamic(
  () => import("@/components/three/PeptideTorusHero").then((m) => m.PeptideTorusHero),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full w-full animate-pulse bg-gradient-to-br from-accent-soft via-bg to-ice-soft"
        aria-hidden
      />
    ),
  },
)

export const HomeShop3DCarousel = dynamic(
  () => import("@/components/three/Shop3DCarousel").then((m) => m.Shop3DCarousel),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[420px] w-full animate-pulse bg-gradient-to-br from-surface-2 to-bg"
        aria-hidden
      />
    ),
  },
)
