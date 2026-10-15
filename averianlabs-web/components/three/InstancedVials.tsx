"use client"

import type { LabelCell } from "@/lib/three/label-atlas"
import { getVialGeometries } from "@/lib/three/vial-assets"
import { useEffect, useMemo } from "react"
import * as THREE from "three"

export interface InstancedVialSpec {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  hue: number
  label?: LabelCell
}

/** Three draw calls for neutral illustrative containers, without simulated contents/packaging. */
export function InstancedVials({ specs }: { specs: InstancedVialSpec[] }) {
  const geometries = useMemo(() => getVialGeometries(), [])
  const meshes = useMemo(() => {
    const body = new THREE.InstancedMesh(
      geometries.body,
      new THREE.MeshStandardMaterial({ color: "#e7edf4", roughness: 0.7 }),
      specs.length,
    )
    const cap = new THREE.InstancedMesh(
      geometries.cap,
      new THREE.MeshStandardMaterial({ color: "#768397", roughness: 0.8 }),
      specs.length,
    )
    const crimp = new THREE.InstancedMesh(
      geometries.crimp,
      new THREE.MeshStandardMaterial({ color: "#c4ccd7", roughness: 0.65 }),
      specs.length,
    )
    return { body, cap, crimp }
  }, [geometries, specs.length])
  useEffect(() => {
    const dummy = new THREE.Object3D()
    for (const [index, spec] of specs.entries()) {
      dummy.position.set(...spec.position)
      dummy.rotation.set(...spec.rotation)
      dummy.updateMatrix()
      meshes.body.setMatrixAt(index, dummy.matrix)
      const base = dummy.matrix.clone()
      meshes.cap.setMatrixAt(
        index,
        base.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.88, 0)),
      )
      meshes.crimp.setMatrixAt(
        index,
        base.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.97, 0)),
      )
    }
    for (const mesh of Object.values(meshes)) mesh.instanceMatrix.needsUpdate = true
  }, [meshes, specs])
  useEffect(
    () => () => {
      for (const mesh of Object.values(meshes)) {
        mesh.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
    },
    [meshes],
  )
  return (
    <>
      <primitive object={meshes.body} />
      <primitive object={meshes.cap} />
      <primitive object={meshes.crimp} />
    </>
  )
}
