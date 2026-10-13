"use client"

import { LazyOnVisible } from "@/components/three/LazyOnVisible"
import { Skeleton } from "@/components/ui/Skeleton"
import dynamic from "next/dynamic"
import type { ComponentProps } from "react"

/**
 * Lazy, ssr:false wrapper for the 3D hero. The underlying component pulls in
 * `@react-three/fiber` + `drei` + `postprocessing` + `three` (~600 KB gzipped)
 * which used to land in the initial bundle.
 *
 * Two-stage deferral (PERF-1 + baseline-2026-10-13 fix):
 *   1. `next/dynamic({ ssr: false })` keeps the chunk out of SSR and out of
 *      the initial page bundle.
 *   2. `LazyOnVisible` wraps the dynamic component and only mounts it when
 *      the element is near the viewport (IntersectionObserver) or the
 *      browser is idle. The 2026-10-13 baseline measured 7,350 ms of TBT on
 *      cold homepage load from this chunk alone; deferring the mount moves
 *      it off the first-paint critical path.
 *
 * The skeleton matches the hero's reserved space so layout shift stays at
 * zero while the canvas is hydrating.
 */
const HeroScene = dynamic(
  () => import("./PeptideTorusHero").then((m) => ({ default: m.PeptideTorusHero })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-[var(--radius-xl)]" />,
  },
)

type HeroSceneProps = ComponentProps<typeof HeroScene>

export function LazyPeptideTorusHero(props: HeroSceneProps) {
  return (
    <LazyOnVisible
      fallback={<Skeleton className="h-full w-full rounded-[var(--radius-xl)]" />}
      rootMargin="200px"
    >
      <HeroScene {...props} />
    </LazyOnVisible>
  )
}
