"use client"

import { cn } from "@/lib/utils/cn"
import { type ReactNode, useEffect, useRef, useState } from "react"

export function LazyOnVisible({
  children,
  fallback,
  rootMargin = "200px",
  className,
  eagerOnIntersect = false,
}: {
  children: ReactNode
  fallback: ReactNode
  rootMargin?: string
  className?: string
  eagerOnIntersect?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (mounted) return
    let scheduled = false
    let cancel: (() => void) | undefined
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      if (eagerOnIntersect) {
        setMounted(true)
        return
      }
      if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(() => setMounted(true), { timeout: 1500 })
        cancel = () => window.cancelIdleCallback(id)
      } else {
        const id = setTimeout(() => setMounted(true), 0)
        cancel = () => clearTimeout(id)
      }
    }
    if (!ref.current || !("IntersectionObserver" in window)) {
      schedule()
      return () => cancel?.()
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          schedule()
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(ref.current)
    return () => {
      observer.disconnect()
      cancel?.()
    }
  }, [mounted, rootMargin, eagerOnIntersect])
  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      {mounted ? children : fallback}
    </div>
  )
}
