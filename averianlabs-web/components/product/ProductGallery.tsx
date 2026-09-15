"use client"

import { VialGraphicSkeleton } from "@/components/product/VialGraphic"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import type { Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { Box, Image as ImageIcon, Maximize2, RotateCw, Sparkles, ZoomIn } from "lucide-react"
import dynamic from "next/dynamic"
import { type CSSProperties, useEffect, useRef, useState } from "react"

const ProductVialScene = dynamic(
  () => import("@/components/three/ProductVialScene").then((m) => m.ProductVialScene),
  {
    ssr: false,
    loading: () => <VialSkeleton />,
  },
)

function VialSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <VialGraphicSkeleton className="h-64 w-32" />
    </div>
  )
}

interface ProductGalleryProps {
  product: Product
}

/**
 * Build a set of synthesized "gallery views" for a product — since real product
 * photography doesn't exist yet, we generate themed variants from the product
 * colour so the gallery always feels populated and useful.
 */
function buildGallery(product: Product) {
  const hue = product.hue
  return [
    {
      id: "3d",
      kind: "3d" as const,
      label: "3D view",
      badge: true,
    },
    {
      id: "lab",
      kind: "static" as const,
      label: "Lab vial",
      gradient: `linear-gradient(135deg, hsl(${hue} 70% 96%), hsl(${hue} 70% 78%))`,
    },
    {
      id: "macro",
      kind: "static" as const,
      label: "Label detail",
      gradient: `linear-gradient(160deg, hsl(${hue} 70% 90%), hsl(${hue} 50% 60%))`,
    },
    {
      id: "lyo",
      kind: "static" as const,
      label: "Lyophilized",
      gradient: `radial-gradient(circle at 30% 30%, hsl(${hue} 90% 96%), hsl(${hue} 60% 80%))`,
    },
  ]
}

function GalleryStaticTile({ gradient, label }: { gradient: string; label: string }) {
  return (
    <div
      className="relative flex aspect-square h-full w-full items-center justify-center overflow-hidden"
      style={{ background: gradient }}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="vial-glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.10)" />
          </linearGradient>
        </defs>
        <g transform="translate(50 60)">
          {/* cap */}
          <rect x="-14" y="-44" width="28" height="6" rx="2" fill="rgba(0,0,0,0.25)" />
          <rect x="-18" y="-50" width="36" height="6" rx="1" fill="rgba(0,0,0,0.45)" />
          {/* vial body */}
          <rect
            x="-16"
            y="-38"
            width="32"
            height="68"
            rx="4"
            fill="url(#vial-glass)"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="0.6"
          />
          {/* liquid */}
          <rect x="-13" y="6" width="26" height="22" rx="2" fill="rgba(255,255,255,0.6)" />
          {/* label */}
          <rect
            x="-13"
            y="-12"
            width="26"
            height="22"
            fill="rgba(255,255,255,0.9)"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth="0.4"
          />
          <text
            x="0"
            y="-3"
            textAnchor="middle"
            fontFamily="ui-sans-serif, system-ui"
            fontSize="3.5"
            fontWeight="600"
            fill="rgba(20,30,55,0.85)"
          >
            {label.toUpperCase()}
          </text>
        </g>
      </svg>
      <div className="absolute inset-x-0 bottom-2 flex justify-center">
        <span className="rounded-full bg-surface/85 px-2 py-0.5 text-3xs font-medium text-ink-muted backdrop-blur-md">
          {label}
        </span>
      </div>
    </div>
  )
}

export function ProductGallery({ product }: ProductGalleryProps) {
  // Default to the first static tile — three.js (and the 1.6 MB HDRI) only
  // loads when the visitor explicitly opens the 3D view.
  const [active, setActive] = useState(1)
  const [resetKey, setResetKey] = useState(0)
  const [inView, setInView] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const gallery = buildGallery(product)
  const current = gallery[active] ?? gallery[0]

  // Pause the WebGL canvas when it scrolls out of view.
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { rootMargin: "120px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (!current) return null

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="hue-radial relative aspect-square overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface"
        style={{ "--cat-hue": product.hue } as CSSProperties}
      >
        {current.kind === "3d" ? (
          inView ? (
            <>
              <ProductVialScene key={resetKey} product={product} reducedMotion={reducedMotion} />
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
                <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-3xs text-ink-muted shadow-sm backdrop-blur-md">
                  <ZoomIn className="h-3 w-3" />
                  Drag to rotate · scroll to zoom
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetKey((k) => k + 1)}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/80 text-ink-muted shadow-sm backdrop-blur-md transition-colors hover:text-ink"
                aria-label="Reset 3D view"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <VialSkeleton />
          )
        ) : (
          <GalleryStaticTile gradient={current.gradient} label={current.label} />
        )}

        {product.purityPercent ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-1 text-xs font-semibold text-accent-ink shadow-sm">
            <Sparkles className="h-3 w-3" />
            {product.purityPercent.toFixed(1)}% HPLC
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {gallery.map((tile, i) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show ${tile.label}`}
            aria-pressed={active === i}
            style={
              tile.kind === "static"
                ? { background: tile.gradient }
                : ({ "--cat-hue": product.hue } as CSSProperties)
            }
            className={cn(
              "relative aspect-square overflow-hidden rounded-[var(--radius)] border-2 transition-all",
              tile.kind === "3d" && "hue-radial",
              active === i ? "border-accent shadow-md" : "border-line hover:border-accent/40",
            )}
          >
            {tile.kind === "3d" ? (
              <div className="flex h-full w-full items-center justify-center">
                <Box className="h-5 w-5 text-ink-muted" />
                <span className="absolute left-1.5 top-1.5 rounded bg-accent px-1 py-0.5 text-3xs font-semibold text-white">
                  3D
                </span>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-4 w-4 text-ink-muted opacity-60" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
