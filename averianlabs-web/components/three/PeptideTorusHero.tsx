"use client"

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import type { Product } from "@/lib/products/types"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { PeptideTorusCanvas } from "./PeptideTorusCanvas"

interface PeptideTorusHeroProps {
  products: Product[]
  locale?: string
  onSelect?: (product: Product) => void
}

export function PeptideTorusHero({ products, locale, onSelect }: PeptideTorusHeroProps) {
  const t = useTranslations("shop")
  const router = useRouter()
  const reduced = useReducedMotion()
  const [paused, setPaused] = useState(false)

  const handleSelect =
    onSelect ?? ((p: Product) => router.push(`/${locale ?? "en"}/shop/${p.slug}`))

  const rotate = (delta: number) => {
    window.dispatchEvent(new CustomEvent("torus-rotate", { detail: delta }))
  }

  return (
    <div className="relative h-full w-full">
      {/* The canvas is decorative for AT — the product list below is the
          accessible representation. */}
      <div aria-hidden="true" className="h-full w-full">
        <PeptideTorusCanvas
          products={products}
          reducedMotion={reduced || paused}
          onSelect={handleSelect}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="relative h-64 w-64 animate-float opacity-40">
          <div className="absolute inset-0 rounded-full gradient-radial-blue opacity-60 blur-3xl" />
          <div className="absolute inset-8 rounded-full border border-line/60 bg-surface/40 backdrop-blur-xl" />
          <div className="absolute inset-16 rounded-full border border-accent/30 bg-accent/10" />
          <div className="absolute inset-24 rounded-full bg-accent shadow-glow" />
        </div>
      </div>

      {/* Visible controls: rotate + pause (also serves reduced-motion users). */}
      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
        <button
          type="button"
          onClick={() => rotate(-0.6)}
          aria-label={t("carouselPrev")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/85 text-ink-muted shadow-sm backdrop-blur-md transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? t("carouselResume") : t("carouselPause")}
          aria-pressed={paused}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/85 text-ink-muted shadow-sm backdrop-blur-md transition-colors hover:bg-surface hover:text-ink"
        >
          {paused ? (
            <Play className="h-4 w-4" aria-hidden />
          ) : (
            <Pause className="h-4 w-4" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={() => rotate(0.6)}
          aria-label={t("carouselNext")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/85 text-ink-muted shadow-sm backdrop-blur-md transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Screen-reader product list — same items the torus shows. */}
      <ul className="sr-only">
        {products.map((p) => (
          <li key={p.slug}>
            <Link href={`/${locale ?? "en"}/shop/${p.slug}`}>{p.defaultTranslation.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
