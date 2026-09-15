"use client"

import type { Product } from "@/lib/products/types"
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import { Suspense, useEffect, useRef, useState } from "react"
import type { Group } from "three"
import { Lighting } from "./Lighting"
import { PostFX } from "./PostFX"
import { Vial } from "./Vial"

interface ProductVialSceneProps {
  product: Product
  reducedMotion?: boolean
}

function VialContainer({ product, autoRotate }: { product: Product; autoRotate: boolean }) {
  const ref = useRef<Group>(null)
  const minVial = product.vials.reduce(
    (min, v) => (v.priceCents < min.priceCents ? v : min),
    product.vials[0]!,
  )

  useFrame((_, dt) => {
    if (ref.current && autoRotate) ref.current.rotation.y += dt * 0.25
  })

  return (
    <group ref={ref} position={[0, -0.1, 0]}>
      <Vial
        name={product.defaultTranslation.name}
        sku={minVial.sku}
        hue={product.hue}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        hovered={false}
        onHover={() => {}}
      />
    </group>
  )
}

export function ProductVialScene({ product, reducedMotion }: ProductVialSceneProps) {
  const [autoRotate, setAutoRotate] = useState(!reducedMotion)

  return (
    <Canvas
      camera={{ position: [0, 0.45, 5.4], fov: 32 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      shadows
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        {/* Self-hosted HDRI (public/hdr) — no third-party CDN fetch, CSP-clean. */}
        <Environment files="/hdr/studio_small_03_1k.hdr" environmentIntensity={0.8} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.4}
          color="#e8f1ff"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 2, -2]} intensity={0.7} color="#a4c8ff" />
        <pointLight position={[0, -2, 2]} intensity={0.4} color="#7fb6ff" />

        <VialContainer product={product} autoRotate={autoRotate} />

        <ContactShadows
          position={[0, -1.05, 0]}
          opacity={0.45}
          scale={6}
          blur={2.5}
          far={2.5}
          color="#0a1530"
        />

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={2.5}
          maxDistance={6}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.7}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          onStart={() => setAutoRotate(false)}
        />

        <PostFX />
      </Suspense>
    </Canvas>
  )
}
