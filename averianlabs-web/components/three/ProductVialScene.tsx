"use client"

import { VialGraphic } from "@/components/product/VialGraphic"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { OrbitControls } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react"
import { useTranslations } from "next-intl"
import { Component, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { Group } from "three"
import { Lighting } from "./Lighting"
import { Vial } from "./Vial"

interface ProductVialSceneProps {
  name: string
  sku: string
  reducedMotion?: boolean
}

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Model({
  name,
  sku,
  rotating,
  turn,
  onContextLost,
}: ProductVialSceneProps & {
  rotating: boolean
  turn: number
  onContextLost: () => void
}) {
  const ref = useRef<Group>(null)
  const { gl, invalidate } = useThree()
  useEffect(() => {
    if (ref.current) ref.current.rotation.y = turn
    invalidate()
  }, [turn, invalidate])
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => {
      event.preventDefault()
      onContextLost()
    }
    canvas.addEventListener("webglcontextlost", lost)
    return () => canvas.removeEventListener("webglcontextlost", lost)
  }, [gl, onContextLost])
  useFrame((_, dt) => {
    if (ref.current && rotating) ref.current.rotation.y += dt * 0.16
  })
  return (
    <group ref={ref} position={[0, -0.15, 0]}>
      <Vial
        name={name}
        sku={sku}
        hue={0}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        onHover={() => {}}
      />
    </group>
  )
}

/** Optional schematic only; exact localized name/SKU stay accessible outside the canvas. */
export function ProductVialScene({ name, sku, reducedMotion }: ProductVialSceneProps) {
  const t = useTranslations("research")
  const systemReduced = useReducedMotion()
  const reduced = reducedMotion ?? systemReduced
  const [rotating, setRotating] = useState(false)
  const [turn, setTurn] = useState(0)
  const [resetVersion, setResetVersion] = useState(0)
  const [failed, setFailed] = useState(false)
  const [supported, setSupported] = useState<boolean | null>(null)
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl")
      setSupported(Boolean(context))
      context?.getExtension("WEBGL_lose_context")?.loseContext()
    } catch {
      setSupported(false)
    }
  }, [])
  useEffect(() => {
    if (reduced) setRotating(false)
  }, [reduced])
  const fallback = (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-5" role="status">
      <VialGraphic className="h-36 w-24" />
      <p className="max-w-xs text-center text-xs text-ink-muted">{t("threeDUnavailable")}</p>
    </div>
  )
  if (failed || supported === false) return fallback
  if (supported === null)
    return (
      <div className="flex h-full items-center justify-center">
        <VialGraphic className="h-40 w-28" />
      </div>
    )
  const button =
    "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-line bg-surface px-3 text-ink hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
  return (
    <SceneBoundary fallback={fallback}>
      <div className="relative h-full w-full">
        <div aria-hidden="true" className="absolute inset-0 bottom-14">
          <Canvas
            key={resetVersion}
            camera={{ position: [0, 0.3, 4.6], fov: 32 }}
            dpr={[1, 1.5]}
            frameloop={rotating && !reduced ? "always" : "demand"}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
            fallback={fallback}
            style={{ background: "transparent" }}
          >
            <Lighting />
            <Model
              name={name}
              sku={sku}
              rotating={rotating && !reduced}
              turn={turn}
              onContextLost={() => setFailed(true)}
            />
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              autoRotate={false}
              onStart={() => setRotating(false)}
            />
          </Canvas>
        </div>
        <div className="absolute inset-x-0 bottom-3 flex flex-wrap items-center justify-center gap-2 px-3">
          <button
            type="button"
            className={button}
            aria-label={t("turnLeft")}
            onClick={() => {
              setRotating(false)
              setTurn((value) => value - Math.PI / 6)
            }}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className={button}
            aria-label={t(rotating ? "pauseRotation" : "resumeRotation")}
            aria-pressed={rotating}
            disabled={reduced}
            onClick={() => setRotating((value) => !value)}
          >
            {rotating ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
          </button>
          <button
            type="button"
            className={button}
            aria-label={t("turnRight")}
            onClick={() => {
              setRotating(false)
              setTurn((value) => value + Math.PI / 6)
            }}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className={button}
            aria-label={t("resetView")}
            onClick={() => {
              setRotating(false)
              setTurn(0)
              setResetVersion((value) => value + 1)
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </SceneBoundary>
  )
}
