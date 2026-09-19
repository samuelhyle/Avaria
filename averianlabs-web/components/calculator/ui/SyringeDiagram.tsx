"use client"

import { useReducedMotion } from "@/components/calculator/hooks/use-prefers-reduced-motion"
import { SYRINGE_PRESETS, type SyringeSpec } from "@/lib/calculator/syringe"
import { cn } from "@/lib/utils/cn"
import { motion } from "motion/react"
import { useMemo } from "react"

interface SyringeDiagramProps {
  syringe?: SyringeSpec
  /** Volume to draw in mL. */
  volumeMl: number
  /** Show major tick labels (every Nth). */
  showLabels?: boolean
  /** Compact mode for inline use. */
  compact?: boolean
  className?: string
  /** Accessible label for the rendered diagram. */
  ariaLabel?: string
}

/**
 * `SyringeDiagram` — SVG insulin syringe with the calculated volume
 * visualised as a filled plunger + animated highlight. Respects
 * `prefers-reduced-motion`.
 *
 * Drawing width is dynamic per barrel size so the smaller 0.3 mL syringe
 * doesn't look identical to the 1.0 mL. All other proportions (tick
 * spacing, label positions) are derived from the number of ticks the
 * syringe exposes (30 / 50 / 100 IU).
 */
export function SyringeDiagram({
  syringe = SYRINGE_PRESETS[2]!,
  volumeMl,
  showLabels = true,
  compact = false,
  className,
  ariaLabel,
}: SyringeDiagramProps) {
  const reduced = useReducedMotion()
  const safeMl = Number.isFinite(volumeMl) && volumeMl >= 0 ? Math.max(0, volumeMl) : 0
  const fillRatio = Math.min(1, safeMl / syringe.barrelMl)
  // The plunger sits at the *back* of the filled liquid — for a 1 mL barrel
  // with 0.1 mL drawn, the highlight should sit at 10% of the barrel
  // measured from the needle.
  const fillWidth = useMemo(() => Math.max(0, Math.min(syringe.barrelMl, safeMl)), [safeMl, syringe.barrelMl])

  const height = compact ? 60 : 110
  const width = compact ? 230 : 360
  const barrelLength = compact ? 140 : 240
  const barrelHeight = compact ? 16 : 26
  const barrelX = compact ? 50 : 70
  const barrelY = (height - barrelHeight) / 2
  const needleLength = compact ? 28 : 50

  const tickEveryMajor = Math.max(1, Math.floor(syringe.ticks / syringe.majorTicks))

  const animatedWidth = reduced ? fillWidth : fillWidth
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-auto w-full text-ink-muted", className)}
      role="img"
      aria-label={ariaLabel ?? `Syringe showing ${(safeMl * 1000).toFixed(0)} microlitres filled`}
    >
      <defs>
        <linearGradient id="syringe-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.7 0.12 220)" />
          <stop offset="100%" stopColor="oklch(0.55 0.16 235)" />
        </linearGradient>
        <linearGradient id="syringe-barrel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.96 0.005 250)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="oklch(0.99 0 0)" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Plunger tail + thumb pad */}
      <rect
        x={barrelX + barrelLength + 4}
        y={compact ? barrelY - 8 : barrelY - 14}
        width={compact ? 18 : 28}
        height={compact ? barrelHeight + 16 : barrelHeight + 28}
        rx={compact ? 4 : 6}
        fill="oklch(0.92 0.01 250)"
        stroke="oklch(0.78 0.02 250)"
        strokeWidth="1"
      />
      {/* Plunger rod */}
      <rect
        x={barrelX + barrelLength - (1 - fillRatio) * barrelLength}
        y={barrelY + barrelHeight / 2 - (compact ? 2 : 3)}
        width={(1 - fillRatio) * barrelLength + 2}
        height={compact ? 4 : 6}
        fill="oklch(0.55 0.05 240)"
      />

      {/* Barrel */}
      <rect
        x={barrelX}
        y={barrelY}
        width={barrelLength}
        height={barrelHeight}
        rx={compact ? 6 : 10}
        fill="url(#syringe-barrel)"
        stroke="oklch(0.82 0.01 250)"
        strokeWidth="1"
      />

      {/* Filled liquid */}
      <motion.rect
        x={barrelX + barrelLength - (animatedWidth / syringe.barrelMl) * barrelLength}
        y={barrelY + 2}
        width={(animatedWidth / syringe.barrelMl) * barrelLength - 2}
        height={barrelHeight - 4}
        rx={compact ? 4 : 7}
        fill="url(#syringe-fill)"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 18 }}
        style={{ transformOrigin: "right center" }}
      />

      {/* Ticks */}
      {Array.from({ length: syringe.ticks + 1 }).map((_, idx) => {
        const ratio = idx / syringe.ticks
        const x = barrelX + (1 - ratio) * barrelLength
        const isMajor = idx % tickEveryMajor === 0
        return (
          <line
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            x1={x}
            x2={x}
            y1={barrelY}
            y2={barrelY + (isMajor ? (compact ? 6 : 10) : compact ? 3 : 5)}
            stroke="currentColor"
            strokeOpacity={isMajor ? 0.85 : 0.5}
            strokeWidth={isMajor ? 1 : 0.5}
          />
        )
      })}

      {/* Major labels */}
      {showLabels &&
        Array.from({ length: syringe.majorTicks + 1 }).map((_, idx) => {
          const ratio = idx / syringe.majorTicks
          const x = barrelX + (1 - ratio) * barrelLength
          const label = `${Math.round(ratio * syringe.ticks)}`
          return (
            <text
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              x={x}
              y={barrelY + barrelHeight + (compact ? 10 : 16)}
              textAnchor="middle"
              fontSize={compact ? 7 : 11}
              fontFamily="var(--font-mono, monospace)"
              fill="currentColor"
            >
              {label}
            </text>
          )
        })}

      {/* Needle */}
      <rect
        x={barrelX - needleLength}
        y={barrelY + barrelHeight / 2 - 1}
        width={needleLength - 4}
        height={2}
        fill="oklch(0.55 0.02 250)"
      />
      <polygon
        points={`${barrelX - needleLength},${barrelY + barrelHeight / 2 - 3} ${barrelX - needleLength - 6},${barrelY + barrelHeight / 2} ${barrelX - needleLength},${barrelY + barrelHeight / 2 + 3}`}
        fill="oklch(0.4 0.02 250)"
      />

      {/* Callout: highlight the target volume */}
      {fillRatio > 0 && fillRatio <= 1 ? (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduced ? { duration: 0 } : { delay: 0.4, duration: 0.4 }}
        >
          <circle
            cx={barrelX + (1 - fillRatio) * barrelLength - 6}
            cy={barrelY + barrelHeight / 2}
            r={compact ? 3 : 5}
            fill="oklch(0.55 0.16 235)"
          />
        </motion.g>
      ) : null}
    </svg>
  )
}
