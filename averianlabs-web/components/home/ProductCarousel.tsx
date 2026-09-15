"use client"

import { ProductCard } from "@/components/product/ProductCard"
import type { Locale, Product } from "@/lib/products/types"
import { cn } from "@/lib/utils/cn"
import useEmblaCarousel from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"

interface ProductCarouselProps {
  products: Product[]
  locale: Locale | string
  heading?: string
  subheading?: string
  className?: string
}

export function ProductCarousel({
  products,
  locale,
  heading,
  subheading,
  className,
}: ProductCarouselProps) {
  const tCommon = useTranslations("common")
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    skipSnaps: false,
    containScroll: "trimSnaps",
    slidesToScroll: 1,
  })

  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    setScrollSnaps(emblaApi.scrollSnapList())
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])

  return (
    <div className={cn("relative", className)}>
      {(heading || subheading) && (
        <div className="mb-8 flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            {heading && (
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {heading}
              </h2>
            )}
            {subheading && <p className="mt-3 text-ink-muted text-pretty">{subheading}</p>}
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              aria-label={tCommon("previousProducts")}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition-all hover:bg-surface-2 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed",
              )}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              disabled={!canScrollNext}
              aria-label={tCommon("nextProducts")}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition-all hover:bg-surface-2 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed",
              )}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Carousel viewport */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-5">
          {products.map((p) => (
            <div
              key={p.slug}
              className="min-w-0 flex-[0_0_calc(100%-1rem)] sm:flex-[0_0_calc(50%-0.625rem)] lg:flex-[0_0_calc(33.333%-0.833rem)] xl:flex-[0_0_calc(25%-0.9375rem)]"
            >
              <ProductCard product={p} locale={locale as Locale} />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile nav arrows */}
      <div className="mt-6 flex items-center justify-center gap-3 sm:hidden">
        <button
          type="button"
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          aria-label={tCommon("previousProducts")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition-all hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="font-mono text-xs text-ink-muted">
          {selectedIndex + 1} / {products.length}
        </span>
        <button
          type="button"
          onClick={scrollNext}
          disabled={!canScrollNext}
          aria-label={tCommon("nextProducts")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition-all hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Dot pagination */}
      {scrollSnaps.length > 1 && (
        <div className="mt-4 hidden items-center justify-center gap-1.5 sm:flex">
          {scrollSnaps.map((_, i) => (
            <button
              key={`dot-${i}-${scrollSnaps.length}`}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={tCommon("goToSlide", { index: i + 1 })}
              className="inline-flex h-6 min-w-6 items-center justify-center px-0.5"
            >
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  selectedIndex === i
                    ? "w-6 bg-accent shadow-glow"
                    : "w-1.5 bg-ink-muted/30 hover:bg-ink-muted/60",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
