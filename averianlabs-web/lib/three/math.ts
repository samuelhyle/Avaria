export interface TorusLayout {
  radius: number
  count: number
  baseY: number
}

export function torusPosition(
  layout: TorusLayout,
  angle: number,
  index: number,
): [number, number, number] {
  const offset = (index / layout.count) * Math.PI * 2
  const a = angle + offset
  const yWave = Math.sin(a * 1.5) * 0.15
  return [Math.sin(a) * layout.radius, layout.baseY + yWave, Math.cos(a) * layout.radius]
}

export function torusRotation(
  angle: number,
  index: number,
  count: number,
): [number, number, number] {
  const offset = (index / count) * Math.PI * 2
  const a = angle + offset
  return [0, a + Math.PI, 0]
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

export function shortestAngle(from: number, to: number): number {
  const TAU = Math.PI * 2
  let diff = (((to - from) % TAU) + TAU) % TAU
  if (diff > Math.PI) diff -= TAU
  return diff
}

export function snapAngle(angle: number, slots: number): number {
  const slot = (Math.PI * 2) / slots
  return Math.round(angle / slot) * slot
}
