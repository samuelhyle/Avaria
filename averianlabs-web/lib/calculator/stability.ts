/**
 * `lib/calculator/stability.ts` — post-reconstitution shelf life estimates.
 *
 * Real peptides degrade after reconstitution. The numbers below are
 * rough lab averages from the published CoA stability sheets and a few
 * common in-house storage guides — use them as a starting hypothesis, not
 * gospel. Always verify against the batch's CoA.
 */

import { roundLiquid } from "@/lib/calculator/round"

export type StorageTemp = "frozen_minus20" | "refrigerated_2to8" | "room_temp"

export interface StabilityProfile {
  slug: string
  shelfLife: Record<StorageTemp, number> // days
  notes?: string
}

const TABLE: Record<string, StabilityProfile> = {
  "bac-water": {
    slug: "bac-water",
    shelfLife: { frozen_minus20: 30, refrigerated_2to8: 30, room_temp: 1 },
    notes: "BAC water is the diluent, not a peptide — 28 days is standard.",
  },
  "bpc-157": {
    slug: "bpc-157",
    shelfLife: { frozen_minus20: 90, refrigerated_2to8: 14, room_temp: 1 },
    notes: "BPC-157 is robust. Snap-freeze aliquots at −20 °C to limit freeze-thaw cycles.",
  },
  "bpc-tb-blend": {
    slug: "bpc-tb-blend",
    shelfLife: { frozen_minus20: 90, refrigerated_2to8: 14, room_temp: 1 },
  },
  selank: {
    slug: "selank",
    shelfLife: { frozen_minus20: 90, refrigerated_2to8: 14, room_temp: 1 },
    notes: "Selank resists freeze-thaw damage — single-vial storage is fine.",
  },
  semax: {
    slug: "semax",
    shelfLife: { frozen_minus20: 60, refrigerated_2to8: 7, room_temp: 1 },
  },
  retatrutide: {
    slug: "retatrutide",
    shelfLife: { frozen_minus20: 60, refrigerated_2to8: 7, room_temp: 1 },
    notes: "Retatrutide is a long-chain peptide — refrigerate and use within 7 days, or aliquot and freeze.",
  },
  tirzepatide: {
    slug: "tirzepatide",
    shelfLife: { frozen_minus20: 90, refrigerated_2to8: 21, room_temp: 2 },
  },
  "ghk-cu": {
    slug: "ghk-cu",
    shelfLife: { frozen_minus20: 60, refrigerated_2to8: 7, room_temp: 1 },
    notes: "Copper(II) oxidises — refrigerate and protect from light.",
  },
  "nad-plus": {
    slug: "nad-plus",
    shelfLife: { frozen_minus20: 60, refrigerated_2to8: 14, room_temp: 1 },
    notes: "NAD+ hydrolyses quickly at room temperature. Freeze immediately after reconstitution.",
  },
  "cjc-1295": {
    slug: "cjc-1295",
    shelfLife: { frozen_minus20: 60, refrigerated_2to8: 14, room_temp: 1 },
  },
  "aod-9604": {
    slug: "aod-9604",
    shelfLife: { frozen_minus20: 60, refrigerated_2to8: 14, room_temp: 1 },
  },
  "hgh-frag-176-191": {
    slug: "hgh-frag-176-191",
    shelfLife: { frozen_minus20: 60, refrigerated_2to8: 7, room_temp: 1 },
  },
  "melanotan-i": {
    slug: "melanotan-i",
    shelfLife: { frozen_minus20: 90, refrigerated_2to8: 14, room_temp: 1 },
  },
  "melanotan-ii": {
    slug: "melanotan-ii",
    shelfLife: { frozen_minus20: 90, refrigerated_2to8: 14, room_temp: 1 },
  },
  "mots-c": {
    slug: "mots-c",
    shelfLife: { frozen_minus20: 60, refrigerated_2to8: 7, room_temp: 1 },
  },
  klow: {
    slug: "klow",
    shelfLife: { frozen_minus20: 60, refrigerated_2to8: 14, room_temp: 1 },
  },
}

const FALLBACK: StabilityProfile = {
  slug: "default",
  shelfLife: { frozen_minus20: 60, refrigerated_2to8: 7, room_temp: 1 },
  notes: "Default conservative estimate — verify against your batch CoA.",
}

export function getStabilityFor(slug?: string | null): StabilityProfile {
  if (slug && TABLE[slug]) return TABLE[slug]!
  return FALLBACK
}

export interface StabilityEstimate {
  recommendedTemp: StorageTemp
  shelfLifeDays: number
  notes: string
}

export function recommendStorage(slug?: string | null): StabilityEstimate {
  const profile = getStabilityFor(slug)
  return {
    recommendedTemp: "refrigerated_2to8",
    shelfLifeDays: profile.shelfLife.refrigerated_2to8,
    notes: profile.notes ?? "",
  }
}

/** Round-trip pretty: "5 days", "2 weeks". */
export function formatShelfLife(days: number): string {
  if (days <= 0) return "—"
  const trim = (n: number) => (Number.isInteger(n) ? String(n) : String(roundLiquid(n, 1)))
  if (days >= 30) {
    return `${trim(days / 30)} months`
  }
  if (days >= 14) {
    return `${trim(days / 7)} weeks`
  }
  return `${days} days`
}

export const STORAGE_LABELS: Record<StorageTemp, string> = {
  frozen_minus20: "−20 °C",
  refrigerated_2to8: "2–8 °C",
  room_temp: "Room temperature",
}
