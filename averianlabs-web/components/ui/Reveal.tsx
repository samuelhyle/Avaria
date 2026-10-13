"use client"

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { cn } from "@/lib/utils/cn"
import { type ReactNode, useEffect, useRef } from "react"

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  distance?: number
  once?: boolean
}

// Content is visible in server HTML, without JavaScript and with reduced motion.
// Viewport animation is a progressive enhancement; it never hides later sections.
export function Reveal({
  children,
  className,
  delay = 0,
  duration = 700,
  distance = 24,
  once = true,
}: RevealProps) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (
      !element ||
      reduced ||
      typeof IntersectionObserver === "undefined" ||
      typeof element.animate !== "function"
    )
      return
    let animation: Animation | null = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        animation?.cancel()
        animation = element.animate(
          [
            { opacity: 0, transform: `translateY(${distance}px)` },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration, delay, easing: "cubic-bezier(.2,.8,.2,1)" },
        )
        if (once) observer.disconnect()
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      animation?.cancel()
    }
  }, [reduced, delay, duration, distance, once])
  return (
    <div ref={ref} className={cn("min-w-0", className)}>
      {children}
    </div>
  )
}
