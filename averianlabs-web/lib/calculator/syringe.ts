/**
 * `lib/calculator/syringe.ts` — insulin-syringe specs and unit conversions.
 *
 * Most reconstitution workflows use 1 mL / 100 IU insulin syringes, but
 * 0.5 mL / 50 IU and 0.3 mL / 30 IU syringes are common too. The IU scale
 * comes from insulin: 1 IU of insulin = 0.01 mL on a standard 1 mL / 100 IU
 * syringe, so the math generalises:
 *
 *   volume (mL)   = IU ÷ (IU per mL)
 *   volume (mL)   = dose (mcg) ÷ concentration (mcg/mL)
 *   syringe ticks = volume (mL) × IU per mL
 *
 * The product page and AI tool both round `volumePerDose` to the relevant
 * tick size before handing it to the user — that's this module's job.
 */

import { roundIu, roundLiquid } from "@/lib/calculator/round"

export interface SyringeSpec {
  /** Display label, e.g. "1 mL · 100 IU insulin syringe". */
  label: string
  /** Total barrel volume in mL. */
  barrelMl: number
  /** Total ticks on the barrel — usually IU × 1 mL barrel. */
  ticks: number
  /** IU per mL. 100 for a 1 mL / 100 IU syringe, 50 for 0.5 mL / 50 IU. */
  iuPerMl: number
  /** Number of major (labelled) tick increments between min/max. */
  majorTicks: number
}

export const SYRINGE_PRESETS: readonly SyringeSpec[] = [
  { label: "0.3 mL · 30 IU", barrelMl: 0.3, ticks: 30, iuPerMl: 100, majorTicks: 5 },
  { label: "0.5 mL · 50 IU", barrelMl: 0.5, ticks: 50, iuPerMl: 100, majorTicks: 5 },
  { label: "1.0 mL · 100 IU", barrelMl: 1, ticks: 100, iuPerMl: 100, majorTicks: 10 },
] as const

export const DEFAULT_SYRINGE: SyringeSpec = SYRINGE_PRESETS[2]!

/**
 * Convert IU drawn on a syringe to mL volume. Useful when the user knows
 * the IU on the barrel but the dose math is in mL.
 */
export function iuToMl(iu: number, iuPerMl: number): number {
  if (!Number.isFinite(iu) || !Number.isFinite(iuPerMl) || iuPerMl <= 0) return Number.NaN
  return iu / iuPerMl
}

/** Inverse of {@link iuToMl}. */
export function mlToIu(ml: number, iuPerMl: number): number {
  if (!Number.isFinite(ml) || !Number.isFinite(iuPerMl) || iuPerMl <= 0) return Number.NaN
  return ml * iuPerMl
}

/**
 * Round a draw volume in mL to the nearest syringe tick.
 *
 *   iu   = roundIu(ml * iuPerMl, 1)  // always 1-tick resolution
 *   ml   = iu / iuPerMl
 *
 * Default tick precision is 1 IU because the user-facing claims in
 * `reports/ai-chat-reconstitution.jsonl` round to whole IU ("10 IU",
 * "5 IU", "7.5 IU"). 0.5 IU precision is enabled by setting `tickSize`.
 */
export function snapToSyringeTicks(
  ml: number,
  syringe: SyringeSpec = DEFAULT_SYRINGE,
  tickSize = 1,
): { volumeMl: number; iu: number; ticksConsumed: number } {
  if (!Number.isFinite(ml) || ml < 0) {
    return { volumeMl: 0, iu: 0, ticksConsumed: 0 }
  }
  const iu = roundIu(ml * syringe.iuPerMl, tickSize)
  const volumeMl = roundLiquid(iu / syringe.iuPerMl, 4)
  return {
    volumeMl,
    iu,
    ticksConsumed: Math.round(iu),
  }
}

/**
 * Pick the smallest-volume syringe whose barrel is bigger than `volumeMl`
 * drawn. Falls back to the largest syringe if the smallest can't hold the
 * volume (≥ 0.3 mL barrel not enough) — the caller can then suggest a
 * dilution chain via {@link lib/calculator/dilution.ts}.
 */
export function smallestSyringeFor(volumeMl: number): SyringeSpec {
  if (!Number.isFinite(volumeMl) || volumeMl <= 0) return DEFAULT_SYRINGE
  const fits = SYRINGE_PRESETS.find((s) => volumeMl <= s.barrelMl)
  return fits ?? DEFAULT_SYRINGE
}
