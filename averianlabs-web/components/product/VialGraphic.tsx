import { cn } from "@/lib/utils/cn"

interface VialGraphicProps {
  /** Retained for existing callers; colour never represents material appearance. */
  hue?: number
  name?: string
  sku?: string
  showLabel?: boolean
  className?: string
}

/** Neutral diagram, not a packaging photograph or a representation of contents. */
export function VialGraphic({ showLabel = true, className }: VialGraphicProps) {
  return (
    <div aria-hidden="true" role="presentation" className={cn("relative", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 96 128"
        fill="none"
        className="h-full w-full text-ink-muted"
      >
        <rect
          x="25"
          y="31"
          width="46"
          height="84"
          rx="10"
          className="fill-surface stroke-current"
          strokeWidth="2"
        />
        <path
          d="M30 44v55c0 6 3 10 8 11"
          stroke="currentColor"
          strokeOpacity=".2"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect
          x="23"
          y="22"
          width="50"
          height="15"
          rx="4"
          className="fill-surface-2 stroke-current"
          strokeWidth="2"
        />
        <path d="M29 27h38M29 32h38" stroke="currentColor" strokeOpacity=".25" strokeWidth="1.5" />
        {showLabel ? (
          <rect
            x="29"
            y="62"
            width="38"
            height="29"
            rx="3"
            className="fill-surface-2 stroke-current"
            strokeOpacity=".35"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        ) : null}
        <path
          d="M32 121h32"
          stroke="currentColor"
          strokeOpacity=".14"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export function VialGraphicSkeleton({ className }: { className?: string }) {
  return <VialGraphic className={cn("opacity-40", className)} />
}
