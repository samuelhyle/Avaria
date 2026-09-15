import { cn } from "@/lib/utils/cn"
import type { HTMLAttributes } from "react"

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-line bg-surface shadow-sm transition-shadow duration-200 hover:shadow",
        className,
      )}
      {...rest}
    />
  )
}
