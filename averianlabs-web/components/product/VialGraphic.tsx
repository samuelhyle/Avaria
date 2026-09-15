import { cn } from "@/lib/utils/cn"
import type { CSSProperties } from "react"

interface VialGraphicProps {
  hue: number
  name?: string
  sku?: string
  showLabel?: boolean
  className?: string
}

/**
 * Shared CSS vial illustration used by product cards, quick view, the gallery
 * fallback and the 3D-carousel fallback. The wrapper controls the size; the
 * art fills it.
 */
export function VialGraphic({ hue, name, sku, showLabel = true, className }: VialGraphicProps) {
  const style = { "--vial-hue": hue } as CSSProperties

  return (
    <div className={cn("relative", className)} style={style}>
      {/* Vial body */}
      <div
        className="absolute inset-x-[28%] inset-y-0 rounded-[35%] shadow-lg"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--vial-hue) 70% 88% / 0.6), hsl(var(--vial-hue) 70% 60% / 0.4))",
          boxShadow:
            "inset 8px 0 24px hsl(var(--vial-hue) 70% 30% / 0.18), inset -8px 0 24px hsl(var(--vial-hue) 70% 30% / 0.10)",
        }}
      />
      {/* Cap */}
      <div
        className="absolute inset-x-[20%] top-[8%] h-[12%] rounded-sm"
        style={{ background: "hsl(var(--vial-hue) 15% 22%)" }}
      />
      {/* Flip-off cap */}
      <div
        className="absolute inset-x-[16%] top-[2%] h-[8%] rounded-sm"
        style={{ background: "hsl(220 15% 78%)" }}
      />
      {showLabel ? (
        <div
          className="absolute inset-x-[30%] inset-y-[44%] rounded-sm"
          style={{
            background: "hsl(var(--vial-hue) 70% 96%)",
            boxShadow: "inset 0 0 0 1px hsl(var(--vial-hue) 70% 45% / 0.2)",
          }}
        >
          <div className="flex h-full w-full flex-col items-center justify-center px-1 text-center">
            {name ? (
              <span
                className="truncate text-3xs font-semibold"
                style={{ color: "hsl(var(--vial-hue) 70% 22%)" }}
              >
                {name}
              </span>
            ) : null}
            {sku ? (
              <span
                className="mt-0.5 truncate font-mono text-3xs"
                style={{ color: "hsl(var(--vial-hue) 30% 35%)" }}
              >
                {sku}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function VialGraphicSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute inset-x-[28%] inset-y-0 animate-pulse rounded-[35%]"
        style={{
          background: "linear-gradient(135deg, hsl(214 70% 92% / 0.5), hsl(214 70% 65% / 0.3))",
        }}
      />
      <div className="absolute inset-x-[20%] top-[8%] h-[12%] rounded-sm bg-[hsl(220_15%_78%)]" />
    </div>
  )
}
