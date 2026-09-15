"use client"

import { VialGraphic } from "@/components/product/VialGraphic"
import type { Locale, Product } from "@/lib/products/types"
import { damp, shortestAngle, snapAngle, torusPosition, torusRotation } from "@/lib/three/math"
import { formatCurrency } from "@/lib/utils/format"
import { ContactShadows, Environment } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import {
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MutableRefObject } from "react"
import * as THREE from "three"
import { InstancedVials } from "./InstancedVials"
import { Lighting } from "./Lighting"

interface ShopCarouselProps {
  products: Product[]
  locale: Locale | string
  reducedMotion?: boolean
}

interface SceneProps {
  products: Product[]
  activeIdx: number
  onActiveChange: (i: number) => void
  autoRotate: boolean
  angleRef: MutableRefObject<number>
  targetAngleRef: MutableRefObject<number | null>
  onSelect: (p: Product) => void
  radius: number
}

// Shared geometry to avoid recreating for every vial
const VIAL_GEOMETRY = {
  body: new THREE.CylinderGeometry(0.45, 0.45, 1.4, 64, 1, false),
  liquid: new THREE.CylinderGeometry(0.46, 0.46, 0.18, 64),
  cap: new THREE.CylinderGeometry(0.32, 0.32, 0.15, 32),
  crimp: new THREE.CylinderGeometry(0.5, 0.5, 0.12, 64),
  label: new THREE.CylinderGeometry(
    0.448,
    0.448,
    1.35,
    64,
    1,
    true,
    -Math.PI / 3,
    (2 * Math.PI) / 3,
  ),
}

function useTorusLayout(products: Product[], radius: number) {
  return useMemo(() => {
    return products.map((p, i) => {
      const position = torusPosition({ radius, count: products.length, baseY: 0 }, 0, i)
      const rotation = torusRotation(0, i, products.length)
      return { position, rotation, product: p }
    })
  }, [products, radius])
}

function Scene({
  products,
  activeIdx,
  onActiveChange,
  autoRotate,
  angleRef,
  targetAngleRef,
  onSelect,
  radius,
}: SceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { gl, camera } = useThree()
  const velocityRef = useRef(0.001)
  const draggingRef = useRef(false)
  const lastX = useRef(0)
  const lastT = useRef(0)
  const lastReportedIdx = useRef(activeIdx)
  const zoomRef = useRef(radius)

  const layout = useTorusLayout(products, radius)

  useEffect(() => {
    const el = gl.domElement
    el.style.touchAction = "none"

    const onDown = (e: PointerEvent) => {
      draggingRef.current = true
      lastX.current = e.clientX
      lastT.current = performance.now()
      try {
        el.setPointerCapture(e.pointerId)
      } catch {}
    }
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      const dx = e.clientX - lastX.current
      const now = performance.now()
      const dt = Math.max(1, now - lastT.current)
      velocityRef.current = (dx / dt) * 0.5
      angleRef.current += (dx / el.clientWidth) * Math.PI * 2
      lastX.current = e.clientX
      lastT.current = now
      // Manual rotation always wins over a queued snap-to-slot
      targetAngleRef.current = null
    }
    const onUp = () => {
      draggingRef.current = false
    }

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 2) return
      angleRef.current += (e.deltaY / el.clientWidth) * Math.PI * 1.2
      targetAngleRef.current = null
    }

    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("pointercancel", onUp)
    el.addEventListener("wheel", onWheel, { passive: true })

    return () => {
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("pointercancel", onUp)
      document.body.style.cursor = "auto"
    }
  }, [gl.domElement, angleRef, targetAngleRef])

  useFrame((state, dt) => {
    // Animate toward an explicit slot requested by the prev/next/dot controls.
    if (targetAngleRef.current !== null) {
      const target = targetAngleRef.current
      const diff = shortestAngle(angleRef.current, target)
      const k = Math.min(1, dt * 6)
      angleRef.current += diff * k
      if (Math.abs(diff) < 0.003) {
        angleRef.current = target
        targetAngleRef.current = null
      }
      velocityRef.current = 0
    } else if (!draggingRef.current && autoRotate) {
      angleRef.current += velocityRef.current
      velocityRef.current *= 0.94 ** (dt * 60)
    } else if (!draggingRef.current) {
      velocityRef.current *= 0.85 ** (dt * 60)
    }

    if (groupRef.current) {
      const targetRotY = damp(groupRef.current.rotation.y, -angleRef.current, 12, dt)
      groupRef.current.rotation.y = targetRotY
    }

    if (targetAngleRef.current === null && groupRef.current && products.length > 0) {
      const currentRot = groupRef.current.rotation.y
      const slot = (Math.PI * 2) / products.length
      const front = ((-currentRot % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      const idx = Math.round(front / slot) % products.length
      if (idx !== lastReportedIdx.current) {
        lastReportedIdx.current = idx
        onActiveChange(idx)
      }
    }

    const t = state.clock.getElapsedTime()
    if (camera instanceof THREE.PerspectiveCamera) {
      const idle = !draggingRef.current && targetAngleRef.current === null
      const drift = idle ? 0.18 : 0
      const targetX = Math.sin(t * 0.12) * drift
      const targetY = 1 + Math.cos(t * 0.15) * drift * 0.6
      camera.position.x = damp(camera.position.x, targetX, 4, dt)
      camera.position.y = damp(camera.position.y, targetY, 4, dt)
      camera.lookAt(0, 0, 0)
    }
  })

  return (
    <>
      <Lighting />
      <group ref={groupRef}>
        <InstancedVials
          specs={layout.map(({ position, rotation, product }, i) => ({
            id: product.slug,
            position,
            rotation,
            hue: product.hue,
            label: {
              id: product.slug,
              name: product.defaultTranslation.name,
              sku: product.vials[0]?.sku ?? product.slug.toUpperCase(),
              hue: product.hue,
            },
            hovered: activeIdx === i,
          }))}
        />
      </group>
      <ContactShadows
        position={[0, -1.4, 0]}
        opacity={0.5}
        scale={10}
        blur={3}
        far={3}
        color="#0a1530"
      />
    </>
  )
}

export function Shop3DCarousel({ products, locale, reducedMotion }: ShopCarouselProps) {
  const t = useTranslations("shop")
  const [activeIdx, setActiveIdx] = useState(0)
  const [autoRotate, setAutoRotate] = useState(!reducedMotion)
  const [webglOk, setWebglOk] = useState(true)
  const [inView, setInView] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const angleRef = useRef(0)
  const targetAngleRef = useRef<number | null>(null)
  const router = useRouter()

  // Check if WebGL is supported
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas")
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl")
      if (!gl) setWebglOk(false)
    } catch {
      setWebglOk(false)
    }
  }, [])

  // Respect reduced motion preference
  useEffect(() => {
    if (reducedMotion !== undefined || typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setAutoRotate(!mq.matches)
    const onChange = (e: MediaQueryListEvent) => setAutoRotate(!e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [reducedMotion])

  // Intersection observer for lazy loading
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: "320px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          step(-1)
          break
        case "ArrowRight":
          e.preventDefault()
          step(1)
          break
        case "Home":
          e.preventDefault()
          goTo(0)
          break
        case "End":
          e.preventDefault()
          goTo(products.length - 1)
          break
        case "PageUp":
          e.preventDefault()
          setAutoRotate(false)
          break
        case "PageDown":
          e.preventDefault()
          setAutoRotate(true)
          break
        case "Escape":
          if (autoRotate) {
            e.preventDefault()
            setAutoRotate(false)
          }
          break
        default:
          // Handle number keys 1-9 to jump to first N products
          if (e.key >= "1" && e.key <= "9") {
            const num = Number.parseInt(e.key, 10) - 1
            if (num < products.length) {
              e.preventDefault()
              goTo(num)
            }
          }
          break
      }
    }

    if (rootRef.current) {
      rootRef.current.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      if (rootRef.current) {
        rootRef.current.removeEventListener("keydown", handleKeyDown)
      }
    }
  }, [activeIdx, autoRotate, products.length])

  const slotAngle = useCallback(
    (i: number) => (i / products.length) * Math.PI * 2,
    [products.length],
  )

  const active = products[activeIdx] ?? products[0]
  const translation = active?.translations?.[locale as Locale] ?? active?.defaultTranslation
  const firstVial = active?.vials[0]
  const minVial = firstVial
    ? active.vials.reduce((min, v) => (v.priceCents < min.priceCents ? v : min), firstVial)
    : undefined
  const totalStock = active?.vials.reduce((s, v) => s + v.stockQty, 0) ?? 0
  const isContact = minVial?.contactOnly === true || minVial?.priceCents === 0
  const isLow = !isContact && totalStock > 0 && totalStock < 25

  const goTo = useCallback(
    (i: number) => {
      if (products.length === 0) return
      const wrapped = ((i % products.length) + products.length) % products.length
      setActiveIdx(wrapped)
      setAutoRotate(false)
      targetAngleRef.current = slotAngle(wrapped)
    },
    [products.length, slotAngle],
  )

  const step = useCallback(
    (dir: 1 | -1) => {
      goTo(activeIdx + dir)
    },
    [activeIdx, goTo],
  )

  const handleSelect = useCallback(
    (p: Product) => {
      router.push(`/${locale}/shop/${p.slug}`)
    },
    [locale, router],
  )

  // CSS fallback when WebGL unavailable
  if (!webglOk) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-gradient-to-br from-accent-soft via-bg to-ice-soft p-6">
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <Link
              key={p.slug}
              href={`/${locale}/shop/${p.slug}`}
              className="group flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-line bg-surface/80 p-4 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <VialGraphic hue={p.hue} showLabel={false} className="h-32 w-20" />
              <p className="text-center text-xs font-semibold">{p.defaultTranslation.name}</p>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("carouselLabel")}
      className="grid gap-0 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-gradient-to-br from-accent-soft via-bg to-ice-soft lg:grid-cols-[1.4fr_1fr]"
    >
      <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[640px]">
        {inView ? (
          <Canvas
            camera={{ position: [0, 1, 10.6], fov: 34 }}
            dpr={[1, 2]}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
              preserveDrawingBuffer: false,
            }}
            shadows
            style={{ background: "transparent" }}
          >
            <Scene
              products={products}
              activeIdx={activeIdx}
              onActiveChange={setActiveIdx}
              autoRotate={autoRotate}
              angleRef={angleRef}
              targetAngleRef={targetAngleRef}
              onSelect={handleSelect}
              radius={4.2}
            />
          </Canvas>
        ) : (
          <div className="flex h-full w-full items-center justify-center gap-4 px-6">
            <VialGraphic
              hue={active?.hue ?? 214}
              name={translation?.name}
              sku={active?.vials[0]?.sku}
              className="h-2/3 w-32 animate-pulse"
            />
          </div>
        )}

        {/* Overlay controls */}
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-start justify-between px-4">
          <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-line bg-surface/85 px-2 py-1 text-3xs font-medium text-ink shadow-sm backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-accent" />
            {t("carouselHint")}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setAutoRotate((v) => !v)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface/85 text-ink-muted shadow-sm backdrop-blur-md hover:text-ink"
              aria-label={autoRotate ? t("carouselPause") : t("carouselResume")}
            >
              {autoRotate ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 flex items-center justify-between px-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              step(-1)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/85 text-ink shadow-md backdrop-blur-md hover:bg-surface active:scale-95 transition-transform"
            aria-label={t("carouselPrev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              step(1)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/85 text-ink shadow-md backdrop-blur-md hover:bg-surface active:scale-95 transition-transform"
            aria-label={t("carouselNext")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Position dots */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5">
          {products.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goTo(i)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={t("carouselGoTo", { name: p.defaultTranslation.name })}
              className="pointer-events-auto inline-flex h-6 min-w-6 items-center justify-center px-0.5"
            >
              <span
                className={`h-1.5 rounded-full transition-all ${
                  activeIdx === i
                    ? "w-6 bg-accent shadow-glow"
                    : "w-1.5 bg-ink-muted/40 hover:bg-ink-muted"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex flex-col justify-center gap-4 border-t border-line bg-surface p-6 lg:border-l lg:border-t-0 lg:p-8">
        <div className="flex items-center gap-2">
          <span className="font-mono text-3xs uppercase tracking-wider text-ink-subtle">
            {String(activeIdx + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}
          </span>
          {active?.latestBatch ? (
            <span className="font-mono text-3xs uppercase tracking-wider text-success">
              · {active.latestBatch.code}
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl text-balance">
            {translation?.name}
          </h3>
          <p className="mt-2 text-sm text-ink-muted text-pretty">{translation?.tagline}</p>
        </div>

        {minVial ? (
          <div className="flex items-baseline gap-2">
            {isContact ? (
              <>
                <span className="font-display text-2xl font-semibold">
                  {t("carouselRequestQuote")}
                </span>
                <span className="text-xs text-ink-subtle">{t("carouselPricingOnRequest")}</span>
              </>
            ) : (
              <>
                <span className="font-display text-2xl font-semibold">
                  {formatCurrency(minVial.priceCents, "EUR", locale)}
                </span>
                {(active?.vials.length ?? 0) > 1 ? (
                  <span className="text-xs text-ink-subtle">
                    {t("carouselFrom", { n: active?.vials.length ?? 0 })}
                  </span>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {active?.purityPercent ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink">
              <FlaskConical className="h-3 w-3" />
              {active.purityPercent.toFixed(1)}% HPLC
            </span>
          ) : null}
          {isContact ? (
            <span className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-muted">
              {t("carouselQuoteOnly")}
            </span>
          ) : totalStock === 0 ? (
            <span className="inline-flex items-center rounded-full border border-danger/20 bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
              {t("outOfStockBadge")}
            </span>
          ) : isLow ? (
            <span className="inline-flex items-center rounded-full border border-warn/20 bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
              {t("lowStockBadge", { n: totalStock })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> {t("inStockBadge")}
            </span>
          )}
        </div>

        {active?.latestBatch && (
          <div className="rounded-[var(--radius)] bg-surface-2/60 p-3 text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-ink-muted">Batch:</span>
              <span className="font-mono font-medium">{active.latestBatch.code}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-ink-muted">HPLC:</span>
              <span className="font-mono font-medium text-success">
                {active.latestBatch.hplcPurity}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Lab:</span>
              <span className="font-mono font-medium">{active.latestBatch.lab}</span>
            </div>
          </div>
        )}

        {minVial ? (
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href={`/${locale}/shop/${active?.slug}`}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] bg-accent px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              {t("carouselView")}
              <ChevronRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setActiveIdx(0)
                setAutoRotate(true)
                targetAngleRef.current = 0
              }}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2"
              aria-label={t("carouselReset")}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("carouselReset")}
            </button>
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-1">
          {products.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => goTo(i)}
              className="group flex h-6 flex-1 items-center"
              aria-label={t("carouselJumpTo", { name: p.defaultTranslation.name })}
            >
              <span
                className={`h-1 w-full rounded-full transition-all ${
                  activeIdx === i ? "bg-accent" : "bg-line group-hover:bg-ink-subtle"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
