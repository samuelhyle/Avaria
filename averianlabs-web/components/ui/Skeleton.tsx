import { cn } from "@/lib/utils/cn"
import type { HTMLAttributes } from "react"

/**
 * Loading placeholder. Uses the shared `.shimmer` treatment so every skeleton
 * across the app reads the same (see `styles/globals.css`).
 */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("shimmer rounded-[var(--radius)]", className)} {...rest} />
}
