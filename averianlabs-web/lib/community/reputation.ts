/**
 * Reputation system — 5 tiers, points accumulate from reactions received.
 */
export type ReputationTier = "new" | "contributor" | "analyst" | "senior" | "fellow"

export interface Tier {
  id: ReputationTier
  name: string
  min: number
  color: "muted" | "accent" | "ice" | "success" | "warn"
}

export const TIERS: readonly Tier[] = [
  { id: "new", name: "New", min: 0, color: "muted" },
  { id: "contributor", name: "Contributor", min: 5, color: "accent" },
  { id: "analyst", name: "Analyst", min: 25, color: "ice" },
  { id: "senior", name: "Senior", min: 100, color: "success" },
  { id: "fellow", name: "Fellow", min: 250, color: "warn" },
] as const

export function tierFor(reputation: number): Tier {
  let result: Tier | null = null
  for (const t of TIERS) {
    if (reputation >= t.min) result = t
  }
  const fallback = TIERS[0]
  return result ?? fallback ?? { id: "new", name: "New", min: 0, color: "muted" }
}

export function nextTier(reputation: number): Tier | null {
  for (const t of TIERS) {
    if (t.min > reputation) return t
  }
  return null
}

export function progressToNext(
  reputation: number,
): { current: number; target: number; pct: number } | null {
  const next = nextTier(reputation)
  if (!next) return null
  const current = tierFor(reputation)
  const span = next.min - current.min
  const within = reputation - current.min
  return {
    current: within,
    target: span,
    pct: Math.min(100, Math.round((within / span) * 100)),
  }
}
