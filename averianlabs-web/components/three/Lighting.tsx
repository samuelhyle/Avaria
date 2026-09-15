"use client"

import { Environment } from "@react-three/drei"

export function Lighting() {
  return (
    <>
      {/* Main directional light with shadows */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.6}
        color="#e8f1ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Secondary light for fill */}
      <directionalLight position={[-4, 3, -2]} intensity={0.6} color="#a4c8ff" />

      {/* Subtle ambient light */}
      <ambientLight intensity={0.4} />

      {/* Additional point light for depth */}
      <pointLight position={[0, -3, 0]} intensity={0.3} color="#7fb6ff" />

      {/* Self-hosted HDRI (public/hdr) — no third-party CDN fetch, CSP-clean */}
      <Environment files="/hdr/studio_small_03_1k.hdr" environmentIntensity={0.6} />
    </>
  )
}
