"use client"

import { ProductLabel } from "@/components/product/ProductLabel"
import { ProductVisual } from "@/components/product/ProductVisual"
import { QualityChart } from "@/components/product/QualityChart"
import type { BatchCertificate } from "@/lib/certificates/types"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { defaultVial } from "@/lib/products/selection"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import { formatSize } from "@/lib/utils/format"
import { Box, FlaskConical, ShieldCheck, Tag } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

const ProductVialScene = dynamic(
  () => import("@/components/three/ProductVialScene").then((module) => module.ProductVialScene),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto h-64 w-40 animate-pulse rounded-xl bg-surface-2" aria-hidden />
    ),
  },
)

type MediaView = "studio" | "label" | "quality"

/**
 * Product media.
 *
 * A shopper cannot read a 20 mm vial label in a picture, so the label is
 * drawn again at reading size with the lot's own numbers on it, and the
 * lot's recorded assay results are drawn beside the specification they were
 * measured against. The generated studio render stays available, and so does
 * the 3D container for shoppers who want to inspect the packaging.
 */
export function ProductGallery({
  product,
  selectedSku,
  certificate,
}: {
  product: Product
  selectedSku?: string
  certificate?: BatchCertificate | null
}) {
  const t = useTranslations("research")
  const p = useTranslations("product")
  const locale = useLocale()
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const selected = product.vials.find((vial) => vial.sku === selectedSku) ?? defaultVial(product)
  const batch = selected?.batch ?? product.latestBatch
  const [view, setView] = useState<MediaView>("studio")
  const [threeD, setThreeD] = useState(false)
  const reducedMotion = useReducedMotion()

  /**
   * The tab that should take the focus once the view has changed.
   *
   * A tab that is not the selected one is not in the tab order, so it cannot
   * be focused before the render that makes it the selected one. The request
   * is therefore held in state and carried out after the view has changed.
   */
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  useEffect(() => {
    if (!focusTarget) return
    document.getElementById(`media-tab-${focusTarget}`)?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  const hasQuality = Boolean(certificate && certificate.tests.length > 0)

  const studioView = {
    id: "studio" as MediaView,
    label: p("mediaStudio"),
    icon: Box,
    hint: t("threeDNotice"),
  }
  const views: Array<{ id: MediaView; label: string; icon: typeof Box; hint: string }> = [
    studioView,
    { id: "label", label: p("mediaLabel"), icon: Tag, hint: p("mediaLabelHint") },
    ...(hasQuality
      ? [
          {
            id: "quality" as MediaView,
            label: p("mediaQuality"),
            icon: FlaskConical,
            hint: p("mediaQualityHint"),
          },
        ]
      : []),
  ]

  const active = views.find((entry) => entry.id === view) ?? studioView

  return (
    <figure
      style={{ ["--cat-hue" as string]: String(product.hue ?? 184) }}
      className="overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <div
        role="tabpanel"
        id={`media-panel-${active.id}`}
        aria-labelledby={`media-tab-${active.id}`}
        className="store-stage relative flex aspect-square items-center justify-center sm:aspect-[4/3]"
      >
        {view === "studio" ? (
          threeD ? (
            <ProductVialScene
              name={translation.name}
              sku={selected?.sku ?? ""}
              reducedMotion={reducedMotion}
            />
          ) : (
            <ProductVisual
              product={product}
              sku={selected?.sku}
              size="lg"
              className="h-[74%] w-auto"
            />
          )
        ) : null}

        {view === "label" ? (
          <div className="h-[86%] w-[86%] max-w-[420px]">
            <ProductLabel
              product={product}
              vial={selected}
              batch={batch}
              locale={locale as Locale}
              name={translation.name}
            />
          </div>
        ) : null}

        {view === "quality" && certificate ? (
          <div className="w-[86%] max-w-[420px] rounded-[var(--radius-lg)] border border-line bg-surface/95 p-5 shadow-[var(--shadow)] backdrop-blur">
            <QualityChart certificate={certificate} />
          </div>
        ) : null}

        {/* Batch / purity chips */}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {product.purityPercent ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-2xs font-semibold text-success shadow-sm backdrop-blur">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
              {product.purityPercent}% HPLC
            </span>
          ) : null}
        </div>

        {view === "studio" ? (
          <button
            type="button"
            aria-pressed={threeD}
            onClick={() => setThreeD((value) => !value)}
            className="absolute bottom-4 right-4 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface/92 px-3.5 py-2 text-xs font-medium text-ink shadow-sm backdrop-blur-md transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Box aria-hidden className="h-3.5 w-3.5" />
            {t(threeD ? "close3d" : "optional3d")}
          </button>
        ) : null}
      </div>

      {/* The view switcher. A shopper reads the media before anything else on
          the page, so the three views sit under the stage rather than behind
          a menu. */}
      <div
        role="tablist"
        aria-label={p("mediaSwitcher")}
        className="flex gap-1.5 border-t border-line px-4 py-3"
        onKeyDown={(event) => {
          const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
          const index = views.findIndex((entry) => entry.id === active.id)
          let next = index
          if (step !== 0) next = (index + step + views.length) % views.length
          else if (event.key === "Home") next = 0
          else if (event.key === "End") next = views.length - 1
          else return
          event.preventDefault()
          const target = views[next]
          if (!target) return
          setFocusTarget(target.id)
          setView(target.id)
        }}
      >
        {views.map((entry) => {
          const Icon = entry.icon
          const isActive = entry.id === active.id
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`media-tab-${entry.id}`}
              aria-selected={isActive}
              aria-controls={`media-panel-${entry.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setView(entry.id)}
              className={cn(
                "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] px-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-accent-soft text-accent-ink"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon aria-hidden className="h-3.5 w-3.5" />
              {entry.label}
            </button>
          )
        })}
      </div>

      <figcaption className="border-t border-line px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{translation.name}</p>
            {selected ? (
              <p className="mt-0.5 break-words font-mono text-xs text-ink-muted">
                {selected.sku} · {formatSize(selected, locale)}
              </p>
            ) : null}
          </div>
          <p className="max-w-[16rem] text-2xs text-ink-subtle">{active.hint}</p>
        </div>
      </figcaption>
    </figure>
  )
}
