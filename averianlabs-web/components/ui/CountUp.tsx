"use client"

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { cn } from "@/lib/utils/cn"
import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export function CountUp({
  end,
  duration = 1500,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: CountUpProps) {
  const reduced = useReducedMotion()
  // The server sends the finished number, so the markup a crawler reads and
  // the markup without JavaScript both carry the real figure. The count
  // starts when the number scrolls into view.
  const [value, setValue] = useState(end)
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (reduced) {
      setValue(end)
      return
    }
    if (!ref.current) return
    let frame = 0
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !startedRef.current) {
          startedRef.current = true
          const start = performance.now()
          const tick = (now: number) => {
            const elapsed = now - start
            const t = Math.min(1, elapsed / duration)
            const eased = 1 - (1 - t) ** 3
            setValue(eased * end)
            if (t < 1) frame = requestAnimationFrame(tick)
            else setValue(end)
          }
          setValue(0)
          frame = requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(ref.current)
    return () => {
      observer.disconnect()
      // Without this the animation keeps calling setValue after unmount.
      if (frame) cancelAnimationFrame(frame)
    }
  }, [end, duration, reduced])

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  )
}
