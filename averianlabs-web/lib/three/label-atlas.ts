import * as THREE from "three"

export interface LabelCell {
  /** Stable id — used as the atlas cache key. */
  id: string
  /** Display name (uppercased on the label). */
  name: string
  /** Display SKU. */
  sku: string
  /** Category hue (0–360). */
  hue: number
}

interface AtlasBuild {
  /** The single CanvasTexture backing every label in the set. */
  texture: THREE.CanvasTexture
  /** UV window into the texture for a given cell id. */
  windowFor(id: string): { offset: THREE.Vector2; repeat: THREE.Vector2 }
  /** Atlas dimensions in cells (cols × rows). */
  cells: { cols: number; rows: number }
}

const TILE_SIZE = 256
const cache = new Map<string, AtlasBuild>()

/**
 * Build (or fetch from cache) a label texture atlas. Cells lay out in a
 * compact grid: 1 cell → 1×1, 2-4 cells → 2×2, 5-9 cells → 3×3, etc.
 * For a single-vial atlas, the whole canvas IS the label (no crop), which
 * means a single InstancedMesh on the PDP can sample it the same way a
 * non-instanced mesh would.
 *
 * Returns a single {@link THREE.CanvasTexture} plus a per-id window helper.
 * The texture is the same instance for every cell in the cache entry;
 * callers attach it to one InstancedMesh and supply per-instance UV offsets.
 */
export function getLabelAtlas(cells: LabelCell[]): AtlasBuild {
  if (cells.length === 0) {
    throw new Error("getLabelAtlas: cells must contain at least one entry")
  }

  const key = cells
    .map((c) => `${c.id}:${c.hue}:${c.name}:${c.sku}`)
    .sort()
    .join("|")

  const cached = cache.get(key)
  if (cached) return cached

  // Pick the smallest square grid that fits every cell with no wasted columns
  // or rows when fewer than 4 cells are used (1×1 for N=1, 2×2 for N∈[2,4]).
  const cols = Math.max(1, Math.ceil(Math.sqrt(cells.length)))
  const rows = Math.max(1, Math.ceil(cells.length / cols))

  const canvas = document.createElement("canvas")
  canvas.width = cols * TILE_SIZE
  canvas.height = rows * TILE_SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context unavailable")

  const cw = 1 / cols
  const ch = 1 / rows
  const tileMap = new Map<string, { col: number; row: number }>()

  cells.forEach((cell, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    tileMap.set(cell.id, { col, row })
    drawTile(ctx, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE, cell)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  const built: AtlasBuild = {
    texture,
    cells: { cols, rows },
    windowFor(id) {
      const tile = tileMap.get(id)
      if (!tile) {
        return { offset: new THREE.Vector2(0, 1 - ch), repeat: new THREE.Vector2(cw, ch) }
      }
      return {
        offset: new THREE.Vector2(tile.col * cw, 1 - (tile.row + 1) * ch),
        repeat: new THREE.Vector2(cw, ch),
      }
    },
  }
  cache.set(key, built)
  return built
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  cell: LabelCell,
) {
  const { name, sku, hue } = cell

  // Background gradient
  const gradient = ctx.createLinearGradient(x0, y0, x0, y0 + h)
  gradient.addColorStop(0, `hsl(${hue} 70% 96%)`)
  gradient.addColorStop(1, `hsl(${hue} 70% 92%)`)
  ctx.fillStyle = gradient
  ctx.fillRect(x0, y0, w, h)

  // Border
  ctx.strokeStyle = `hsl(${hue} 70% 45% / 0.2)`
  ctx.lineWidth = 6
  ctx.strokeRect(x0 + 3, y0 + 3, w - 6, h - 6)

  // Name
  ctx.fillStyle = `hsl(${hue} 70% 22%)`
  ctx.font = `600 ${Math.floor(h * 0.16)}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(name.toUpperCase(), x0 + w / 2, y0 + h * 0.42)

  // SKU
  ctx.fillStyle = `hsl(${hue} 30% 35% / 0.85)`
  ctx.font = `500 ${Math.floor(h * 0.08)}px ui-monospace, monospace`
  ctx.fillText(sku, x0 + w / 2, y0 + h * 0.62)

  // Brand
  ctx.fillStyle = `hsl(${hue} 70% 45%)`
  ctx.font = `600 ${Math.floor(h * 0.07)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText("AVERIANLABS", x0 + w / 2, y0 + h * 0.78)

  // Disclaimer
  ctx.fillStyle = `hsl(${hue} 70% 22% / 0.55)`
  ctx.font = `400 ${Math.floor(h * 0.05)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText("RESEARCH USE ONLY", x0 + w / 2, y0 + h * 0.88)
}
