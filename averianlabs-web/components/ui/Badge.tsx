import { cn } from "@/lib/utils/cn"
import type { HTMLAttributes } from "react"

export type BadgeTone = "default" | "accent" | "success" | "warn" | "danger" | "ice" | "muted"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  size?: "sm" | "md"
}

const toneClasses: Record<BadgeTone, string> = {
  default: "bg-surface-2 text-ink border-line",
  accent: "bg-accent-soft text-accent-ink border-accent/25",
  success: "bg-success-soft text-success border-success/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  ice: "bg-ice-soft text-ice border-ice/25",
  muted: "bg-surface-2 text-ink-muted border-line",
}

export function Badge({ tone = "default", size = "sm", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium tracking-tight",
        size === "sm" ? "px-2 py-0.5 text-xs leading-none" : "px-2.5 py-1 text-sm",
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
