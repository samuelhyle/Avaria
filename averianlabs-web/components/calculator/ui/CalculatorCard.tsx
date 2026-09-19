"use client"

import { cn } from "@/lib/utils/cn"
import type { HTMLAttributes } from "react"

type Tone = "default" | "accent" | "ice" | "muted" | "gradient"

interface CalculatorCardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone
  inset?: boolean
  as?: "div" | "section" | "article"
}

const toneClass: Record<Tone, string> = {
  default:
    "border border-line bg-surface shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)]",
  accent:
    "border border-accent/30 bg-accent-soft/60 shadow-[var(--shadow-xs)]",
  ice:
    "border border-ice/30 bg-ice-soft/60 shadow-[var(--shadow-xs)]",
  muted:
    "border border-line bg-surface-2 shadow-none",
  gradient:
    "border border-line bg-gradient-to-br from-accent-soft via-bg to-ice-soft shadow-[var(--shadow-sm)]",
}

export function CalculatorCard({
  tone = "default",
  inset = false,
  as = "section",
  className,
  children,
  ...rest
}: CalculatorCardProps) {
  const Tag = as
  return (
    <Tag
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] transition-shadow duration-300",
        toneClass[tone],
        inset ? "p-4" : "p-6",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
