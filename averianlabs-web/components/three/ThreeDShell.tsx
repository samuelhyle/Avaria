"use client"

import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils/cn"

/**
 * Visual wrapper around a 3D scene. Adds a small "Illustrative render" badge
 * in the corner so users understand the vial they're looking at is a
 * graphical representation, not a photograph of the actual product.
 *
 * Plan §2.5 / VIS-2 — "Vial renders are illustrative."
 */
export function ThreeDShell({
  children,
  className,
  size = "default",
}: {
  children: ReactNode
  className?: string
  size?: "default" | "carousel"
}) {
  const t = useTranslations("a11y")
  return (
    <div role="group" aria-label={t("illustrative3D")} className={cn("relative", className)}>
      {children}
      <span
        className={cn(
          "pointer-events-none absolute z-10 inline-flex items-center gap-1 rounded-full border border-line bg-surface/80 px-2 py-0.5 text-2xs font-medium text-ink-muted backdrop-blur",
          size === "carousel" ? "bottom-3 right-3" : "bottom-4 right-4",
        )}
      >
        <span aria-hidden="true" className="font-mono">
          ◇
        </span>
        {t("illustrativeBadge")}
      </span>
    </div>
  )
}
