import * as THREE from "three"

const cache = new Map<string, THREE.CanvasTexture>()

export function getLabelTexture(opts: {
  name: string
  sku: string
  hue: number
  size?: number
}): THREE.CanvasTexture {
  const key = `${opts.name}|${opts.sku}|${opts.hue}|${opts.size ?? 256}`
  const cached = cache.get(key)
  if (cached) return cached

  const size = opts.size ?? 256
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context unavailable")

  const w = size
  const h = size

  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, `hsl(${opts.hue} 70% 96%)`)
  gradient.addColorStop(1, `hsl(${opts.hue} 70% 92%)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = `hsl(${opts.hue} 70% 45% / 0.18)`
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, w - 6, h - 6)

  ctx.fillStyle = `hsl(${opts.hue} 70% 22%)`
  ctx.font = `600 ${Math.floor(size * 0.16)}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(opts.name.toUpperCase(), w / 2, h * 0.42)

  ctx.fillStyle = `hsl(${opts.hue} 30% 35% / 0.85)`
  ctx.font = `500 ${Math.floor(size * 0.08)}px ui-monospace, monospace`
  ctx.fillText(opts.sku, w / 2, h * 0.62)

  ctx.fillStyle = `hsl(${opts.hue} 70% 45%)`
  ctx.font = `600 ${Math.floor(size * 0.07)}px ui-sans-serif, sans-serif`
  ctx.fillText("AVERIANLABS", w / 2, h * 0.78)

  ctx.fillStyle = `hsl(${opts.hue} 70% 22% / 0.55)`
  ctx.font = `400 ${Math.floor(size * 0.05)}px ui-sans-serif, sans-serif`
  ctx.fillText("RESEARCH USE ONLY", w / 2, h * 0.88)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  cache.set(key, tex)
  return tex
}
