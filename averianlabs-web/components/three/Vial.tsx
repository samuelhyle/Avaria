"use client"

import { createLabelTexture } from "@/lib/three/label-canvas"
import { getVialGeometries } from "@/lib/three/vial-assets"
import { Edges } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import type { Mesh } from "three"
import * as THREE from "three"

interface VialProps {
  /** Display name for the label. */
  name: string
  /** Display SKU for the label. */
  sku: string
  /** Category hue (0–360) for liquid tinting. */
  hue: number
  position: [number, number, number]
  rotation: [number, number, number]
  hovered?: boolean
  onHover: (v: boolean) => void
  onClick?: () => void
}

export function Vial({
  name,
  sku,
  hue,
  position,
  rotation,
  hovered = false,
  onHover,
  onClick,
}: VialProps) {
  const groupRef = useRef<Mesh>(null)
  const geometries = useMemo(() => getVialGeometries(), [])

  // Per-vial canvas texture (~65KB each, GPU-cached). Memoized per name/sku/hue.
  const labelTexture = useMemo(() => createLabelTexture(name, sku, hue), [name, sku, hue])

  // Dispose the per-vial label texture on unmount.
  useEffect(() => {
    return () => {
      labelTexture.dispose()
    }
  }, [labelTexture])

  // Per-vial colours.
  const liquidColor = useMemo(() => new THREE.Color(`hsl(${hue} 70% 55%)`), [hue])
  const capColor = useMemo(() => new THREE.Color(`hsl(${hue} 15% 25%)`), [hue])
  const crimpColor = useMemo(() => new THREE.Color("hsl(220 15% 78%)"), [])

  // Animate the vial position (lift on hover).
  useFrame((_, dt) => {
    if (!groupRef.current) return
    const targetY = hovered ? position[1] + 0.35 : position[1]
    const k = Math.min(1, dt * 8)
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * k
  })

  return (
    <group position={position} rotation={rotation}>
      <group
        ref={groupRef}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(true)
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          onHover(false)
          document.body.style.cursor = "auto"
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
      >
        <mesh geometry={geometries.body}>
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.92}
            roughness={0.05}
            thickness={0.6}
            ior={1.5}
            clearcoat={1}
            clearcoatRoughness={0.05}
            attenuationColor={liquidColor}
            attenuationDistance={1.2}
            envMapIntensity={1.2}
          />
          <Edges threshold={15} color={liquidColor} />
        </mesh>

        <mesh position={[0, 0.79, 0]} geometry={geometries.liquid}>
          <meshStandardMaterial
            color={liquidColor}
            roughness={0.18}
            metalness={0.05}
            transparent
            opacity={0.95}
          />
        </mesh>

        <mesh position={[0, 0.88, 0]} geometry={geometries.cap}>
          <meshStandardMaterial color={capColor} roughness={0.85} />
        </mesh>

        <mesh position={[0, 0.97, 0]} geometry={geometries.crimp}>
          <meshStandardMaterial color={crimpColor} roughness={0.4} metalness={0.7} />
        </mesh>

        <mesh position={[0, 0.05, 0]} geometry={geometries.label}>
          <meshStandardMaterial
            map={labelTexture}
            roughness={0.5}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  )
}
