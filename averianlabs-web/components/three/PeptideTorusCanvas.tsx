"use client"

/**
 * SSR-safe 3D hero canvas.
 *
 * Architecture:
 *   - This file's static import is just the static fallback grid + a
 *     ClientOnly gate. The `three.js` and `@react-three/fiber` imports
 *     are loaded via `next/dynamic` so they never execute on the server.
 *   - The `Suspense` + `Canvas` + scene tree all live in a sibling file
 *     (`PeptideTorusScene.tsx`) that is `dynamic({ ssr: false })`'d.
 *
 * Result: zero WebGL / three.js work on the server → no BAILOUT_TO_CSR errors.
 */

import type { Product } from "@/lib/products/types"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

const PeptideTorusScene = dynamic(
  () => import("./PeptideTorusScene").then((m) => m.PeptideTorusScene),
  {
    ssr: false,
    loading: () => null,
  },
)

function StaticFallback({ products }: { products: Product[] }) {
  return (
    <div className="grid h-full w-full grid-cols-3 gap-4 p-6">
      {products.slice(0, 6).map((p) => (
        <div
          key={p.slug}
          className="rounded-[var(--radius)] border border-line bg-surface-2 p-4 text-center"
          style={{
            background: `linear-gradient(135deg, hsl(${p.hue} 70% 96%), hsl(${p.hue} 70% 90%))`,
          }}
        >
          <div className="font-display text-lg font-semibold">{p.defaultTranslation.name}</div>
          <div className="mt-1 font-mono text-xs text-ink-muted">{p.vials[0]?.sku}</div>
        </div>
      ))}
    </div>
  )
}

export interface PeptideTorusCanvasProps {
  products: Product[]
  reducedMotion?: boolean
  onSelect?: (product: Product) => void
}

export function PeptideTorusCanvas({ products, reducedMotion, onSelect }: PeptideTorusCanvasProps) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const canvas = document.createElement("canvas")
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl")
      setWebglOk(Boolean(gl))
    } catch {
      setWebglOk(false)
    }
  }, [])

  // SSR / first paint: static product grid. No 3D deps on the server.
  // After mount + WebGL check, render the live 3D scene.
  if (!mounted || webglOk !== true) {
    return <StaticFallback products={products} />
  }

  return <PeptideTorusScene products={products} reducedMotion={reducedMotion} onSelect={onSelect} />
}
