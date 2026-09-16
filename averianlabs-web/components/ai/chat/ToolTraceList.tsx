"use client"

import {
  Beaker,
  Calculator,
  FlaskConical,
  Package,
  Search,
  ShieldAlert,
  ShoppingCart,
} from "lucide-react"

import { cn } from "@/lib/utils/cn"
import type { ToolTrace } from "./types"

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  searchProducts: Search,
  getProduct: Package,
  getBatches: Beaker,
  compareProducts: FlaskConical,
  getReconstitution: Calculator,
  viewCart: ShoppingCart,
  addToCart: ShoppingCart,
  escalateToHuman: ShieldAlert,
}

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = TOOL_ICONS[name] ?? FlaskConical
  return <Icon className={className} />
}

export function ToolTraceList({ trace }: { trace: ToolTrace[] }) {
  return (
    <ul aria-live="polite" className="flex flex-wrap gap-1.5 text-2xs">
      {trace.map((t) => {
        const hasResult = t.result !== undefined
        return (
          <li
            key={t.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono",
              hasResult
                ? "border-line bg-surface-2 text-ink-muted"
                : "border-accent/30 bg-accent/5 text-accent",
            )}
          >
            <ToolIcon name={t.name} className="h-3 w-3" />
            {t.name}
            {hasResult ? (
              <span className="opacity-60">·</span>
            ) : (
              <span className="animate-pulse">…</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
