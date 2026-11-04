"use client"

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { type ReactNode, useEffect, useRef } from "react"

/**
 * The hero stage.
 *
 * The three vials in the hero lean towards the pointer as a group. The outer
 * two travel further than the one in the middle, so the arrangement reads as
 * a set of objects on a bench rather than as one flat picture.
 *
 * The movement is written to two custom properties on the stage instead of
 * to component state: no component re-renders while the pointer moves, and
 * the vials keep their own transforms.
 *
 * On a touch device there is no pointer to follow, and the stage simply
 * holds still.
 */
export function HeroStage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || reduced) return
    if (typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches === false) {
      return
    }

    let frame = 0
    const current = { x: 0, y: 0 }
    let target = { x: 0, y: 0 }

    const apply = () => {
      current.x += (target.x - current.x) * 0.12
      current.y += (target.y - current.y) * 0.12
      element.style.setProperty("--stage-x", `${current.x.toFixed(2)}px`)
      element.style.setProperty("--stage-y", `${current.y.toFixed(2)}px`)
      const settled = Math.abs(target.x - current.x) < 0.05 && Math.abs(target.y - current.y) < 0.05
      if (settled) {
        frame = 0
        return
      }
      frame = requestAnimationFrame(apply)
    }
    const tick = () => {
      if (!frame) frame = requestAnimationFrame(apply)
    }

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5
      target = { x: x * 18, y: y * 12 }
      tick()
    }
    const onLeave = () => {
      target = { x: 0, y: 0 }
      tick()
    }

    element.addEventListener("pointermove", onMove)
    element.addEventListener("pointerleave", onLeave)
    return () => {
      element.removeEventListener("pointermove", onMove)
      element.removeEventListener("pointerleave", onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [reduced])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
