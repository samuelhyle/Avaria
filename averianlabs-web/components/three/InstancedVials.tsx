"use client"

import { type LabelCell, getLabelAtlas } from "@/lib/three/label-atlas"
import { type VialGeometries, getVialGeometries } from "@/lib/three/vial-assets"
import { useEffect, useMemo } from "react"
import * as THREE from "three"

export interface InstancedVialSpec {
  id: string
  position: [number, number, number]
  rotation: [number, number, number]
  hue: number
  /** Atlas label cell — defaults to a chip reading the vial id. */
  label?: LabelCell
}

interface InstancedVialsProps {
  specs: InstancedVialSpec[]
}

interface Bundle {
  body: THREE.InstancedMesh
  liquid: THREE.InstancedMesh
  cap: THREE.InstancedMesh
  crimp: THREE.InstancedMesh
  label: THREE.InstancedMesh
  dispose(): void
}

/**
 * Render N vials in 5 draw calls. All instances share the same shared-module
 * geometries + a single shared label atlas texture; per-instance state lives
 * in `instanceMatrix`, `instanceColor`, and a custom `aAtlasOffset` /
 * `aAtlasRepeat` attribute consumed by the patched label shader.
 *
 * With N=16 this drops the carousel from ~80 draw calls (5 parts × 16 vials)
 * down to 5 — a meaningful win on mid-range mobile.
 */
export function InstancedVials({ specs }: InstancedVialsProps) {
  const geometries = useMemo(() => getVialGeometries(), [])
  const bundle = useMemo(() => buildBundle(geometries, specs.length), [geometries, specs.length])

  // Build (or fetch cached) atlas for this set of labels.
  const atlas = useMemo(() => {
    const cells: LabelCell[] = specs.map(
      (s) =>
        s.label ?? {
          id: s.id,
          name: s.id.toUpperCase().slice(0, 14),
          sku: s.id,
          hue: s.hue,
        },
    )
    return getLabelAtlas(cells)
  }, [specs])

  // Hook the atlas texture into the label material once per atlas change.
  useEffect(() => {
    const mat = bundle.label.material as THREE.MeshStandardMaterial
    mat.map = atlas.texture
    mat.needsUpdate = true
  }, [atlas, bundle.label.material])

  // Wire per-instance state (matrices, colors, atlas UVs).
  useSyncInstanceState(bundle, specs, atlas)

  // Cleanup on unmount.
  useEffect(() => bundle.dispose(), [bundle])

  return (
    <>
      <primitive object={bundle.body} />
      <primitive object={bundle.liquid} />
      <primitive object={bundle.cap} />
      <primitive object={bundle.crimp} />
      <primitive object={bundle.label} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface LabelMaterial extends THREE.MeshStandardMaterial {
  __atlasPatched?: boolean
}

function patchLabelForAtlas(mat: LabelMaterial) {
  if (mat.__atlasPatched) return
  mat.__atlasPatched = true
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        `#include <common>`,
        `#include <common>
attribute vec2 aAtlasOffset;
attribute vec2 aAtlasRepeat;`,
      )
      .replace(
        `#include <uv_vertex>`,
        `#include <uv_vertex>
vMapUv = uv * aAtlasRepeat + aAtlasOffset;`,
      )
    // `vMapUv` is what `<map_fragment>` uses to sample `map`. By overwriting
    // it AFTER the stock `<uv_vertex>` chunk (which already applied the
    // texture's `mapTransform`), each instance samples its own UV window
    // into the shared atlas.
    ;(mat as unknown as { userData: { atlasShader?: unknown } }).userData.atlasShader = shader
  }
}

function buildBundle(geometries: VialGeometries, count: number): Bundle {
  // Build materials. Each gets a private label-companion (no shared state
  // across `<InstancedVials>` mounts).
  const body = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    transmission: 0.92,
    roughness: 0.05,
    thickness: 0.6,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    attenuationDistance: 1.2,
    envMapIntensity: 1.2,
  })
  const liquid = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.95,
  })
  const cap = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85 })
  const crimp = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.4,
    metalness: 0.7,
  })
  const label = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.5,
    metalness: 0,
    side: THREE.DoubleSide,
  }) as LabelMaterial
  patchLabelForAtlas(label)

  const dummy = new THREE.Object3D()

  function makeIm(geom: THREE.BufferGeometry, mat: THREE.Material): THREE.InstancedMesh {
    const im = new THREE.InstancedMesh(geom, mat, count)
    im.frustumCulled = false
    // Initialise every instance to the identity matrix so three.js doesn't
    // fall back to whatever was previously in the matrix buffer.
    dummy.position.set(0, 0, 0)
    dummy.rotation.set(0, 0, 0)
    dummy.updateMatrix()
    for (let i = 0; i < count; i++) im.setMatrixAt(i, dummy.matrix)
    im.instanceMatrix.needsUpdate = true
    return im
  }

  const bodyMesh = makeIm(geometries.body, body)
  const liquidMesh = makeIm(geometries.liquid, liquid)
  const capMesh = makeIm(geometries.cap, cap)
  const crimpMesh = makeIm(geometries.crimp, crimp)
  const labelMesh = makeIm(geometries.label, label)

  return {
    body: bodyMesh,
    liquid: liquidMesh,
    cap: capMesh,
    crimp: crimpMesh,
    label: labelMesh,
    dispose() {
      bodyMesh.dispose()
      liquidMesh.dispose()
      capMesh.dispose()
      crimpMesh.dispose()
      labelMesh.dispose()
      body.dispose()
      liquid.dispose()
      cap.dispose()
      crimp.dispose()
      label.dispose()
    },
  }
}

function useSyncInstanceState(
  bundle: Bundle,
  specs: InstancedVialSpec[],
  atlas: ReturnType<typeof getLabelAtlas>,
) {
  useEffect(() => {
    const dummy = new THREE.Object3D()
    const tmp = new THREE.Color()

    const colorsBody = new Float32Array(specs.length * 3)
    const colorsLiquid = new Float32Array(specs.length * 3)
    const colorsCap = new Float32Array(specs.length * 3)
    const colorsCrimp = new Float32Array(specs.length * 3)
    const offsets = new Float32Array(specs.length * 2)
    const repeats = new Float32Array(specs.length * 2)

    specs.forEach((spec, i) => {
      dummy.position.set(spec.position[0], spec.position[1], spec.position[2])
      dummy.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2])
      dummy.updateMatrix()
      bundle.body.setMatrixAt(i, dummy.matrix)
      bundle.liquid.setMatrixAt(i, dummy.matrix)
      bundle.cap.setMatrixAt(i, dummy.matrix)
      bundle.crimp.setMatrixAt(i, dummy.matrix)
      bundle.label.setMatrixAt(i, dummy.matrix)

      tmp.setHSL(spec.hue / 360, 0.7, 0.55)
      colorsBody[i * 3] = tmp.r
      colorsBody[i * 3 + 1] = tmp.g
      colorsBody[i * 3 + 2] = tmp.b

      tmp.setHSL(spec.hue / 360, 0.7, 0.55)
      colorsLiquid[i * 3] = tmp.r
      colorsLiquid[i * 3 + 1] = tmp.g
      colorsLiquid[i * 3 + 2] = tmp.b

      tmp.setHSL(spec.hue / 360, 0.15, 0.25)
      colorsCap[i * 3] = tmp.r
      colorsCap[i * 3 + 1] = tmp.g
      colorsCap[i * 3 + 2] = tmp.b

      const crimp = new THREE.Color("hsl(220 15% 78%)")
      colorsCrimp[i * 3] = crimp.r
      colorsCrimp[i * 3 + 1] = crimp.g
      colorsCrimp[i * 3 + 2] = crimp.b

      const w = atlas.windowFor(spec.id)
      offsets[i * 2] = w.offset.x
      offsets[i * 2 + 1] = w.offset.y
      repeats[i * 2] = w.repeat.x
      repeats[i * 2 + 1] = w.repeat.y
    })

    bundle.body.instanceColor = new THREE.InstancedBufferAttribute(colorsBody, 3)
    bundle.liquid.instanceColor = new THREE.InstancedBufferAttribute(colorsLiquid, 3)
    bundle.cap.instanceColor = new THREE.InstancedBufferAttribute(colorsCap, 3)
    bundle.crimp.instanceColor = new THREE.InstancedBufferAttribute(colorsCrimp, 3)

    const labelGeo = bundle.label.geometry as THREE.BufferGeometry
    labelGeo.setAttribute("aAtlasOffset", new THREE.InstancedBufferAttribute(offsets, 2))
    labelGeo.setAttribute("aAtlasRepeat", new THREE.InstancedBufferAttribute(repeats, 2))

    bundle.body.instanceMatrix.needsUpdate = true
    bundle.liquid.instanceMatrix.needsUpdate = true
    bundle.cap.instanceMatrix.needsUpdate = true
    bundle.crimp.instanceMatrix.needsUpdate = true
    bundle.label.instanceMatrix.needsUpdate = true
  }, [bundle, specs, atlas])
}
