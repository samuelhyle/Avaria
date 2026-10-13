"use client"

import { LazyOnVisible } from "@/components/three/LazyOnVisible"
import { Skeleton } from "@/components/ui/Skeleton"
import dynamic from "next/dynamic"
import type { ComponentProps } from "react"

/**
 * Lazy, ssr:false wrapper for the 3D shop carousel. Two-stage deferral:
 *
 *   1. `next/dynamic({ ssr: false })` keeps the three.js chunk out of SSR
 *      and out of the initial bundle (PERF-1).
 *   2. `LazyOnVisible` mounts the canvas only when the carousel is near
 *      the viewport (IntersectionObserver) or the browser is idle. The
 *      2026-10-13 Lighthouse baseline showed the homepage hero stealing
 *      7,350 ms of TBT; this wrapper does the same for the carousel so it
 *      does not stack on top.
 */
const Carousel = dynamic(
  () => import("./Shop3DCarousel").then((m) => ({ default: m.Shop3DCarousel })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[420px] w-full rounded-[var(--radius-xl)]" />,
  },
)

type CarouselProps = ComponentProps<typeof Carousel>

export function LazyShop3DCarousel(props: CarouselProps) {
  return (
    <LazyOnVisible
      fallback={<Skeleton className="h-[420px] w-full rounded-[var(--radius-xl)]" />}
      rootMargin="200px"
    >
      <Carousel {...props} />
    </LazyOnVisible>
  )
}
