"use client"

import { checkSaturation } from "@/lib/calculator/saturation"
import { cn } from "@/lib/utils/cn"
import { motion } from "motion/react"

interface ResultRingProps {
  /** Working concentration in mg/mL. */
  concentrationMgPerMl: number
  /** The product slug driving the ceiling. */
  productSlug?: string | null
  className?: string
  /** Maximum value to display on the dial (defaults to ceiling * 1.2). */
  maxValue?: number
}

/**
 * `ResultRing` — animated gauge showing the working concentration against
 * the per-peptide solubility ceiling. Turns amber when above 75 % of the
 * ceiling and red when over.
 */
export function ResultRing({
  concentrationMgPerMl,
  productSlug,
  className,
  maxValue,
}: ResultRingProps) {
  const { ceiling, level } = checkSaturation(concentrationMgPerMl, productSlug)
  const safeCeiling = ceiling.ceilingMgPerMl > 0 ? ceiling.ceilingMgPerMl : 10
  const ceilingTop = Number.isFinite(maxValue) && maxValue && maxValue > 0 ? maxValue : safeCeiling * 1.2
  const ratio = Math.min(1, Math.max(0, concentrationMgPerMl / ceilingTop))
  const dash = Math.round(ratio * 360)
  const colour =
    level === "above"
      ? "stroke-danger"
      : level === "caution"
        ? "stroke-warn"
        : "stroke-accent"

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            className="stroke-line"
            strokeWidth="10"
          />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            className={colour}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="0 360"
            initial={{ strokeDasharray: "0 360" }}
            animate={{ strokeDasharray: `${dash} 360` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
            transform="rotate(-90 60 60)"
          />
          <text
            x="60"
            y="55"
            textAnchor="middle"
            className="fill-ink font-display"
            fontSize="20"
            fontWeight="600"
          >
            {concentrationMgPerMl.toFixed(2)}
          </text>
          <text
            x="60"
            y="72"
            textAnchor="middle"
            className="fill-ink-subtle font-mono"
            fontSize="9"
          >
            mg/mL
          </text>
        </svg>
      </div>
      <div className="text-center text-2xs text-ink-muted">
        <span className="font-mono text-ink">{safeCeiling.toFixed(1)} mg/mL</span>
        <span className="mx-2 text-ink-subtle">·</span>
        <span className="capitalize">{level === "above" ? "Above ceiling" : level === "caution" ? "Approaching ceiling" : "Soluble"}</span>
      </div>
    </div>
  )
}
