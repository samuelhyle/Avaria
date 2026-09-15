"use client"

import { MotionConfig } from "motion/react"
import type { ReactNode } from "react"

/**
 * Global motion policy: honour the OS `prefers-reduced-motion` setting for
 * every `motion/react` animation in the app.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
