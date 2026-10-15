"use client"

import { getVialGeometries } from "@/lib/three/vial-assets"
import { Edges } from "@react-three/drei"
import { useMemo } from "react"

interface VialProps {
  name: string
  sku: string
  hue: number
  position: [number, number, number]
  rotation: [number, number, number]
  hovered?: boolean
  onHover: (value: boolean) => void
  onClick?: () => void
}

/** Neutral illustrative container: no invented fill, product colour or packaging label. */
export function Vial({ position, rotation, onHover, onClick }: VialProps) {
  const geometries = useMemo(() => getVialGeometries(), [])
  return (
    <group position={position} rotation={rotation}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Canvas is decorative; equivalent controls and SKU are outside it. */}
      <group
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
        onClick={onClick}
      >
        <mesh geometry={geometries.body}>
          <meshStandardMaterial color="#e7edf4" roughness={0.7} metalness={0.02} />
          <Edges threshold={20} color="#8290a3" />
        </mesh>
        <mesh position={[0, 0.88, 0]} geometry={geometries.cap}>
          <meshStandardMaterial color="#768397" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.97, 0]} geometry={geometries.crimp}>
          <meshStandardMaterial color="#c4ccd7" roughness={0.65} metalness={0.1} />
        </mesh>
      </group>
    </group>
  )
}
