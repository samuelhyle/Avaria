"use client"

import { cn } from "@/lib/utils/cn"

interface CalculatorStatProps {
  label: string
  value: string
  secondary?: string
  tone?: "default" | "accent" | "ice" | "success" | "warn"
  emphasis?: boolean
  className?: string
}

const toneClass: Record<NonNullable<CalculatorStatProps["tone"]>, string> = {
  default: "text-ink",
  accent: "text-accent",
  ice: "text-ice",
  success: "text-success",
  warn: "text-warn",
}

export function CalculatorStat({
  label,
  value,
  secondary,
  tone = "default",
  emphasis = false,
  className,
}: CalculatorStatProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-line/40 pb-3 last:border-0 last:pb-0",
        className,
      )}
    >
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right">
        <div
          className={cn(
            "font-display tabular-nums leading-none",
            emphasis ? "text-3xl font-semibold" : "text-xl font-semibold",
            toneClass[tone],
          )}
        >
          {value}
        </div>
        {secondary ? <div className="mt-1 font-mono text-2xs text-ink-subtle">{secondary}</div> : null}
      </dd>
    </div>
  )
}
