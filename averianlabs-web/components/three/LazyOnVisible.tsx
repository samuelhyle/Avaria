"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils/cn"

interface LazyOnVisibleProps {
  children: ReactNode
  /** Fallback content shown until the element is in view (or has been so once). */
  fallback: ReactNode
  /** Pixels of pre-roll past the bottom viewport edge to start the load. */
  rootMargin?: string
  className?: string
  /**
   * When false, only mount children after `requestIdleCallback` so first paint
   * isn't blocked. When true, mount on the first IntersectionObserver fire even
   * before idle. Default: false (use idle when available).
   */
  eagerOnIntersect?: boolean
}

/**
 * Defer mounting of an expensive client-only component (e.g. a 3D scene) until
 * either:
 *   1. the surrounding element scrolls into view (IntersectionObserver), or
 *   2. the browser is idle (requestIdleCallback), whichever fires first.
 *
 * The Lighthouse baseline on 2026-10-13 measured 7,350 ms of TBT on a cold
 * load of `/en` caused almost entirely by `next/dynamic` immediately
 * requesting the 3D chunk during the first render. Wrapping the dynamic
 * component in `LazyOnVisible` defers the request until the hero is actually
 * near the viewport, which moves the 3D chunk off the critical path for the
 * first paint.
 */
export function LazyOnVisible({
  children,
  fallback,
  rootMargin = "200px",
  className,
  eagerOnIntersect = false,
}: LazyOnVisibleProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    if (shouldMount) return
    const el = ref.current
    if (!el) return

    // Path A: intersection observer — fire when the element approaches view.
    let unobserve: (() => void) | null = null
    if (typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              if (eagerOnIntersect) setShouldMount(true)
              break
            }
          }
        },
        { rootMargin },
      )
      io.observe(el)
      unobserve = () => io.disconnect()
    }

    // Path B: idle callback — fire after first paint when the browser is free.
    const idleId =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (
            window as unknown as { requestIdleCallback: (cb: () => void) => number }
          ).requestIdleCallback(() => {
            setShouldMount(true)
          })
        : null

    return () => {
      if (unobserve) unobserve()
      if (idleId !== null && "cancelIdleCallback" in window) {
        ;(window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(
          idleId,
        )
      }
    }
  }, [shouldMount, eagerOnIntersect, rootMargin])

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      {shouldMount ? children : fallback}
    </div>
  )
}
