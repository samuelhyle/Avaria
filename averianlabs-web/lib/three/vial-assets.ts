/**
 * Shared 3D geometry for vial components. One geometry is allocated per part
 * the first time this module is touched in the browser, then reused by every
 * `<Vial>` instance. Sharing identical geometry avoids re-uploading the same
 * vertex/index buffers to the GPU for each product.
 *
 * Returns frozen THREE.BufferGeometry instances ready for use as mesh args.
 */

import * as THREE from "three"

export interface VialGeometries {
  body: THREE.CylinderGeometry
  liquid: THREE.CylinderGeometry
  cap: THREE.CylinderGeometry
  crimp: THREE.CylinderGeometry
  label: THREE.CylinderGeometry
}

let geometries: VialGeometries | null = null

function ensureGeometries() {
  if (geometries) return geometries

  const body = new THREE.CylinderGeometry(0.45, 0.45, 1.4, 64, 1, false)
  const liquid = new THREE.CylinderGeometry(0.46, 0.46, 0.18, 64)
  const cap = new THREE.CylinderGeometry(0.32, 0.32, 0.15, 32)
  const crimp = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 64)
  const label = new THREE.CylinderGeometry(
    0.448,
    0.448,
    1.35,
    64,
    1,
    true,
    -Math.PI / 3,
    (2 * Math.PI) / 3,
  )

  geometries = { body, liquid, cap, crimp, label }
  return geometries
}

export function getVialGeometries() {
  return ensureGeometries()
}
