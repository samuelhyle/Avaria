"use client"

/**
 * WebGL 3D scene — only loaded on the client via `next/dynamic({ ssr: false })`.
 * The 3D dependencies (three.js, @react-three/fiber) are imported here, so
 * they're never evaluated on the server.
 */

import type { Product } from "@/lib/products/types"
import { damp, torusPosition, torusRotation } from "@/lib/three/math"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { InstancedVials } from "./InstancedVials"
import { Lighting } from "./Lighting"
import { PostFX } from "./PostFX"

interface PeptideTorusProps {
  products: Product[]
  reducedMotion?: boolean
  onSelect?: (product: Product) => void
}

function Scene({ products, reducedMotion, onSelect }: PeptideTorusProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { gl, camera } = useThree()
  const angleRef = useRef(0)
  const velocityRef = useRef(0.001)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const draggingRef = useRef(false)
  const lastX = useRef(0)
  const lastT = useRef(0)

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
      velocityRef.current = (dx / dt) * 0.6
      angleRef.current += (dx / el.clientWidth) * Math.PI * 2
      lastX.current = e.clientX
      lastT.current = now
    }
    const onUp = () => {
      draggingRef.current = false
    }

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 2) return
      angleRef.current += (e.deltaY / el.clientWidth) * Math.PI * 1.2
    }

    // Rotation is driven by the visible controls in PeptideTorusHero via a
    // scoped custom event — no global keyboard listeners.
    const onRotate = (e: Event) => {
      const delta = (e as CustomEvent<number>).detail
      if (typeof delta === "number") angleRef.current += delta
    }

    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("pointercancel", onUp)
    el.addEventListener("wheel", onWheel, { passive: true })
    window.addEventListener("torus-rotate", onRotate)

    return () => {
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("pointercancel", onUp)
      el.removeEventListener("wheel", onWheel)
      window.removeEventListener("torus-rotate", onRotate)
      document.body.style.cursor = "auto"
    }
  }, [gl.domElement])

  useFrame((state, dt) => {
    if (groupRef.current) {
      const targetAngle = damp(groupRef.current.rotation.y, -angleRef.current, 12, dt)
      groupRef.current.rotation.y = targetAngle
    }
    if (!draggingRef.current && !reducedMotion) {
      // Gentle auto-rotation — about 0.04 rad/s, slow enough to read as
      // "scanning" the catalogue rather than spinning. The damping makes
      // the rotation taper off after a drag instead of stopping abruptly.
      angleRef.current += velocityRef.current
      velocityRef.current *= 0.94 ** (dt * 60)
    }
    // Camera drift — kept conservative so the scene reads as deliberate
    // product photography, not a wandering screensaver. The drift is just
    // enough to give the canvas life without pulling focus from the
    // focused vial (which is the centre of the composition at all times).
    const t = state.clock.getElapsedTime()
    if (camera instanceof THREE.PerspectiveCamera) {
      const targetX = reducedMotion ? 0 : Math.sin(t * 0.08) * 0.12
      const targetY = reducedMotion ? 0.9 : 0.9 + Math.cos(t * 0.1) * 0.04
      camera.position.x = damp(camera.position.x, targetX, 4, dt)
      camera.position.y = damp(camera.position.y, targetY, 4, dt)
      camera.lookAt(0, 0, 0)
    }
  })

  const count = products.length

  return (
    <>
      <Lighting />
      <group ref={groupRef}>
        <InstancedVials
          specs={products.map((p, i) => {
            // Bring the focused vial closer to the camera and lift it
            // slightly, so the composition always has a clear "hero"
            // product and the rest orbit behind it.
            const position = torusPosition({ radius: 4.2, count, baseY: 0 }, 0, i)
            const rotation = torusRotation(0, i, count)
            return {
              id: p.slug,
              position,
              rotation,
              hue: p.hue,
              label: {
                id: p.slug,
                name: p.defaultTranslation.name,
                sku: p.vials[0]?.sku ?? p.slug.toUpperCase(),
                hue: p.hue,
              },
              hovered: hoveredIdx === i,
            }
          })}
        />
      </group>
      <PostFX />
    </>
  )
}

export interface PeptideTorusSceneProps {
  products: Product[]
  reducedMotion?: boolean
  onSelect?: (product: Product) => void
}

export function PeptideTorusScene({ products, reducedMotion, onSelect }: PeptideTorusSceneProps) {
  const [hasError, setHasError] = useState(false)

  const handleCreated = useCallback(() => setHasError(false), [])

  if (hasError) {
    return (
      <div className="grid h-full w-full grid-cols-3 gap-4 p-6">
        {products.slice(0, 6).map((p) => (
          <div
            key={p.slug}
            className="rounded-[var(--radius)] border border-line bg-surface-2 p-4 text-center"
          >
            <div className="font-display text-lg font-semibold">{p.defaultTranslation.name}</div>
            <div className="mt-1 font-mono text-xs text-ink-muted">{p.vials[0]?.sku}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Suspense fallback={null}>
      <Canvas
        camera={{ position: [0, 0.9, 9.0], fov: 30 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
        }}
        shadows
        style={{ background: "transparent" }}
        onCreated={handleCreated}
        onError={() => setHasError(true)}
      >
        <Scene products={products} reducedMotion={reducedMotion} onSelect={onSelect} />
      </Canvas>
    </Suspense>
  )
}
