"use client"

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { cn } from "@/lib/utils/cn"
import { type ReactNode, useEffect, useRef, useState } from "react"

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
  distance?: number
  once?: boolean
}

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
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (reduced) {
      setVisible(true)
      return
    }
    const el = ref.current
    if (!el) return

    // Failsafe: if IntersectionObserver never fires (reduced data-saver modes,
    // headless screenshots, very long pages with misconfigured rootMargin),
    // reveal after a short delay so content is never permanently invisible.
    let io: IntersectionObserver | undefined
    const failsafe = window.setTimeout(() => {
      if (!visible) {
        setVisible(true)
      }
    }, 1200)

    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setVisible(true)
            window.clearTimeout(failsafe)
            if (once) io?.disconnect()
          } else if (!once) {
            setVisible(false)
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
      )
      io.observe(el)
    }

    return () => {
      window.clearTimeout(failsafe)
      io?.disconnect()
    }
  }, [once, reduced, visible])

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible || reduced ? 1 : 0,
        transform: visible || reduced ? "translateY(0)" : `translateY(${distance}px)`,
        transition: reduced
          ? undefined
          : `opacity ${duration}ms cubic-bezier(.2,.8,.2,1) ${delay}ms, transform ${duration}ms cubic-bezier(.2,.8,.2,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  )
}
