"use client"

import { cn } from "@/lib/utils/cn"
import { Calculator, FlaskConical, Sparkles, Truck } from "lucide-react"
import { useTranslations } from "next-intl"

export interface QuickActionsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
  className?: string
}

export function QuickActions({ onSelect, disabled, className }: QuickActionsProps) {
  const t = useTranslations("averia.quickActions")

  const items: Array<{ id: string; icon: React.ReactNode }> = [
    { id: "recommend", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "compare", icon: <FlaskConical className="h-3.5 w-3.5" /> },
    { id: "track", icon: <Truck className="h-3.5 w-3.5" /> },
    { id: "reconstitute", icon: <Calculator className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(t(`${it.id}.prompt`))}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink",
            "transition-colors duration-150 hover:border-accent/40 hover:bg-accent-soft hover:text-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {it.icon}
          {t(`${it.id}.label`)}
        </button>
      ))}
    </div>
  )
}
