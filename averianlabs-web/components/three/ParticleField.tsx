"use client"

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

interface ParticlesProps {
  count?: number
  radius?: number
}

export function ParticleField({ count = 240, radius = 14 }: ParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummyRef = useRef(new THREE.Object3D())

  const data = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = radius * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6
      positions[i * 3 + 2] = r * Math.cos(phi)
      scales[i] = 0.02 + Math.random() * 0.05
    }
    return { positions, scales }
  }, [count, radius])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    meshRef.current.rotation.y = t * 0.02
    const dummy = dummyRef.current
    const { positions, scales } = data
    for (let i = 0; i < count; i++) {
      const ix = i * 3
      const baseX = positions[ix] ?? 0
      const baseY = positions[ix + 1] ?? 0
      const baseZ = positions[ix + 2] ?? 0
      const wob = Math.sin(t * 0.4 + i) * 0.08
      dummy.position.set(baseX, baseY + wob, baseZ)
      dummy.scale.setScalar(scales[i] ?? 0.04)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#7fb6ff" transparent opacity={0.6} />
    </instancedMesh>
  )
}
