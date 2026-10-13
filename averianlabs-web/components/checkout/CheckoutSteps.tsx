"use client"

import { cn } from "@/lib/utils/cn"
import { Check } from "lucide-react"
import { usePathname } from "next/navigation"

interface CheckoutStepsProps {
  steps: Array<{ id: string; label: string }>
}

export function CheckoutSteps({ steps }: CheckoutStepsProps) {
  const pathname = usePathname()
  const currentIdx = steps.findIndex((s) => pathname.endsWith(`/${s.id}`))

  return (
    <ol className="grid grid-cols-2 gap-2 rounded-[var(--radius-lg)] border border-line bg-surface p-2 shadow-sm sm:grid-cols-4">
      {steps.map((step, i) => {
        const active = i === currentIdx
        const done = currentIdx > i
        return (
          <li
            key={step.id}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm",
              active && "bg-accent-soft text-accent-ink",
              !active && !done && "text-ink-muted",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                active && "bg-accent text-white",
                done && "bg-success text-white",
                !active && !done && "bg-surface-2 text-ink-subtle",
              )}
            >
              {done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
            </span>
            <span className="min-w-0 break-words font-medium">{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
