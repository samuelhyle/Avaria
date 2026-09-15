import * as THREE from "three"

/**
 * Render a vial label (product name, SKU, brand, disclaimer) onto a 256×256
 * canvas as a {@link THREE.CanvasTexture}, ready to wrap around the partial
 * label cylinder.
 *
 * One canvas per vial is cheap (~65 KB) and reliable — the texture is
 * memoised per `(name, sku, hue)` by the caller.
 */
export function createLabelTexture(name: string, sku: string, hue: number): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context unavailable")

  const w = size
  const h = size

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, `hsl(${hue} 70% 96%)`)
  gradient.addColorStop(1, `hsl(${hue} 70% 92%)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)

  // Border
  ctx.strokeStyle = `hsl(${hue} 70% 45% / 0.2)`
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, w - 6, h - 6)

  // Name
  ctx.fillStyle = `hsl(${hue} 70% 22%)`
  ctx.font = `600 ${Math.floor(size * 0.16)}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(name.toUpperCase(), w / 2, h * 0.42)

  // SKU
  ctx.fillStyle = `hsl(${hue} 30% 35% / 0.85)`
  ctx.font = `500 ${Math.floor(size * 0.08)}px ui-monospace, monospace`
  ctx.fillText(sku, w / 2, h * 0.62)

  // Brand
  ctx.fillStyle = `hsl(${hue} 70% 45%)`
  ctx.font = `600 ${Math.floor(size * 0.07)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText("AVERIANLABS", w / 2, h * 0.78)

  // Disclaimer
  ctx.fillStyle = `hsl(${hue} 70% 22% / 0.55)`
  ctx.font = `400 ${Math.floor(size * 0.05)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText("RESEARCH USE ONLY", w / 2, h * 0.88)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}
