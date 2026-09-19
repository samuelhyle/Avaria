/**
 * `lib/calculator/reconstitution.ts` — canonical reconstitution math.
 *
 * Single source of truth for "vial + solvent → concentration → draw".
 * Used by:
 *
 *   - `components/calculator/*` — the on-page calculator
 *   - `lib/ai/tools/reconstitution.ts` — the Averia chat tool
 *   - `app/api/ai/chat/route.ts` — validation before invoking the tool
 *
 * The math is locale-independent. Anywhere a UI needs a number, render via
 * `Intl.NumberFormat` / `formatLiquid()` rather than re-implementing it.
 *
 * Definitions:
 *   vialMg           = mg of lyophilised peptide in the vial
 *   solventMl        = mL of diluent added (typically 0.9% BAC water)
 *   doseMcg          = desired peptide mass per draw, in micrograms
 *   syringe          = syringe spec (defaults to a 1 mL / 100 IU insulin)
 *
 * Returns a structured object so callers can show what they need without
 * recomputing anything.
 */

import {
  DEFAULT_SYRINGE,
  type SyringeSpec,
  mlToIu,
  snapToSyringeTicks,
} from "@/lib/calculator/syringe"
import { roundIu, roundLiquid, roundMcg, significant } from "@/lib/calculator/round"

/**
 * Max sensible peptide concentration in mg/mL. Anything denser is almost
 * certainly either (a) a mis-typed solvent volume, or (b) a saturated
 * solution that won't fully dissolve. The on-page calculator surfaces this
 * via a warning; the AI tool already enforces `MAX_RATIO` ≥ this value.
 *
 * 50 mg/mL is the upper practical ceiling across research peptides; most
 * (GHK-Cu, BPC-157, Selank) sit much lower and we surface a per-peptide
 * tighter ceiling via `lib/calculator/saturation.ts`.
 */
export const MAX_PEPTIDE_RATIO_MG_PER_ML = 50

export interface ReconstitutionInputs {
  vialMg: number
  solventMl: number
  doseMcg: number
  syringe?: SyringeSpec
}

export interface ReconstitutionResult {
  inputs: Required<ReconstitutionInputs>
  /** Concentration in mg of peptide per mL of solvent. */
  concentrationMgPerMl: number
  /** Concentration in micrograms per mL — more useful at the bench. */
  concentrationMcgPerMl: number
  /** Total peptide mass in micrograms (vialMg * 1000). */
  totalMcg: number
  /** mL to draw for one dose. */
  volumePerDoseMl: number
  /** IU drawn on the syringe for one dose. */
  iuPerDose: number
  /** IU drawn, rounded to the nearest whole tick (or 0.5 for half-IU). */
  iuPerDoseSnapped: number
  /** mL drawn, snapped to whole-tick IU rounding. */
  volumePerDoseMlSnapped: number
  /** Total discrete doses in the vial (Math.floor; no partial). */
  totalDoses: number
  /** Total mL of reconstituted solution (== solventMl). */
  totalReconstitutedMl: number
  /** mcg remaining unused after drawing the last whole dose. */
  leftoverMcg: number
  /** True when inputs are nonsensical — the caller should show inline errors. */
  invalid?: {
    reason:
      | "missing"
      | "non-positive"
      | "concentration_too_high"
      | "nan"
    fields?: string[]
  }
}

/**
 * Compute the full result for a reconstitution scenario.
 *
 * Returns the result with an `invalid` payload rather than throwing — UI
 * components branch on this so they can surface the actual problem
 * ("Solvent volume must be > 0") instead of a stack trace.
 */
export function solveReconstitution(input: ReconstitutionInputs): ReconstitutionResult {
  const syringe = input.syringe ?? DEFAULT_SYRINGE
  const fields: string[] = []
  if (!Number.isFinite(input.vialMg)) fields.push("vialMg")
  if (!Number.isFinite(input.solventMl)) fields.push("solventMl")
  if (!Number.isFinite(input.doseMcg)) fields.push("doseMcg")
  if (fields.length) {
    return blank(input, syringe, { reason: "nan", fields })
  }
  if (input.vialMg <= 0 || input.solventMl <= 0 || input.doseMcg <= 0) {
    return blank(input, syringe, {
      reason: "non-positive",
      fields: [
        ...(input.vialMg <= 0 ? ["vialMg"] : []),
        ...(input.solventMl <= 0 ? ["solventMl"] : []),
        ...(input.doseMcg <= 0 ? ["doseMcg"] : []),
      ],
    })
  }
  if (Number.isNaN(input.vialMg) || Number.isNaN(input.solventMl) || Number.isNaN(input.doseMcg)) {
    return blank(input, syringe, { reason: "nan", fields })
  }
  const totalMcg = input.vialMg * 1000
  const concentrationMgPerMl = input.vialMg / input.solventMl
  if (concentrationMgPerMl > MAX_PEPTIDE_RATIO_MG_PER_ML) {
    return blank(input, syringe, {
      reason: "concentration_too_high",
      fields: ["vialMg", "solventMl"],
    })
  }
  const concentrationMcgPerMl = concentrationMgPerMl * 1000
  const volumePerDoseMl = input.doseMcg / concentrationMcgPerMl
  const iuPerDose = mlToIu(volumePerDoseMl, syringe.iuPerMl)
  const snapped = snapToSyringeTicks(volumePerDoseMl, syringe, 1)
  const totalDoses = Math.floor(totalMcg / input.doseMcg)
  const leftoverMcg = totalMcg - totalDoses * input.doseMcg
  return {
    inputs: { vialMg: input.vialMg, solventMl: input.solventMl, doseMcg: input.doseMcg, syringe },
    concentrationMgPerMl: roundLiquid(concentrationMgPerMl, 3),
    concentrationMcgPerMl: roundLiquid(concentrationMcgPerMl, 1),
    totalMcg: roundMcg(totalMcg),
    volumePerDoseMl: roundLiquid(volumePerDoseMl, 4),
    iuPerDose: roundLiquid(iuPerDose, 2),
    iuPerDoseSnapped: roundIu(iuPerDose, 1),
    volumePerDoseMlSnapped: roundLiquid(snapped.volumeMl, 4),
    totalDoses,
    leftoverMcg: roundMcg(leftoverMcg),
    totalReconstitutedMl: input.solventMl,
  }
}

function blank(
  input: ReconstitutionInputs,
  syringe: SyringeSpec,
  invalid: NonNullable<ReconstitutionResult["invalid"]>,
): ReconstitutionResult {
  return {
    inputs: {
      vialMg: input.vialMg || 0,
      solventMl: input.solventMl || 0,
      doseMcg: input.doseMcg || 0,
      syringe,
    },
    concentrationMgPerMl: 0,
    concentrationMcgPerMl: 0,
    totalMcg: 0,
    volumePerDoseMl: 0,
    iuPerDose: 0,
    iuPerDoseSnapped: 0,
    volumePerDoseMlSnapped: 0,
    totalDoses: 0,
    totalReconstitutedMl: input.solventMl || 0,
    leftoverMcg: 0,
    invalid,
  }
}

/**
 * Convenience: how many discrete doses fit in the vial, regardless of solvent
 * volume. Solvent doesn't change the *total* peptide (mg → mcg), so the dose
 * count is `Math.floor(vialMg * 1000 / doseMcg)`.
 */
export function vialYield(vialMg: number, doseMcg: number): number {
  if (!Number.isFinite(vialMg) || !Number.isFinite(doseMcg)) return 0
  if (vialMg <= 0 || doseMcg <= 0) return 0
  return Math.floor((vialMg * 1000) / doseMcg)
}

/**
 * Helpful presets so the UI can populate "Common starts". These mirror
 * real-world bench practice and the catalogue anchors (e.g. BPC-157 5 mg
 * + 2 mL BAC, retatrutide 10 mg + 2 mL, GHK-Cu 50 mg + 3 mL).
 */
export interface ReconstitutionPreset {
  id: string
  label: string
  /** A slug hint to filter products on the picker (optional). */
  hint?: string
  vialMg: number
  solventMl: number
  doseMcg: number
}

export const RECONSTITUTION_PRESETS: readonly ReconstitutionPreset[] = [
  { id: "bpc5-2ml-250", label: "BPC-157 · 5 mg / 2 mL / 250 mcg", hint: "bpc-157", vialMg: 5, solventMl: 2, doseMcg: 250 },
  { id: "bpc10-3ml-500", label: "BPC-157 · 10 mg / 3 mL / 500 mcg", hint: "bpc-157", vialMg: 10, solventMl: 3, doseMcg: 500 },
  { id: "selank5-2ml-250", label: "Selank · 5 mg / 2 mL / 250 mcg", hint: "selank", vialMg: 5, solventMl: 2, doseMcg: 250 },
  { id: "reta20-2ml-2mg", label: "Retatrutide · 20 mg / 2 mL / 2 mg", hint: "retatrutide", vialMg: 20, solventMl: 2, doseMcg: 2000 },
  { id: "ghk50-3ml-2mg", label: "GHK-Cu · 50 mg / 3 mL / 2 mg", hint: "ghk-cu", vialMg: 50, solventMl: 3, doseMcg: 2000 },
  { id: "nad1000-10ml-50mg", label: "NAD+ · 1000 mg / 10 mL / 50 mg", hint: "nad-plus", vialMg: 1000, solventMl: 10, doseMcg: 50000 },
] as const

/**
 * Format helpers used by both the chat persona and the on-page UI. Kept
 * centralised to avoid one half using `"250mcg"` and the other `"250 mcg"`.
 */
export function formatMcg(mcg: number, locale: string = "en"): string {
  if (!Number.isFinite(mcg)) return "—"
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  return `${formatter.format(mcg)} mcg`
}

export function formatMg(mg: number, locale: string = "en"): string {
  if (!Number.isFinite(mg)) return "—"
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: mg < 1 ? 2 : mg < 10 ? 2 : 1,
  })
  return `${formatter.format(mg)} mg`
}

export function formatMl(ml: number, locale: string = "en", decimals = 3): string {
  if (!Number.isFinite(ml)) return "—"
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
  return `${formatter.format(ml)} mL`
}

export function formatIu(iu: number, locale: string = "en"): string {
  if (!Number.isFinite(iu)) return "—"
  const decimals = iu % 1 === 0 ? 0 : 1
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${formatter.format(iu)} IU`
}

/** Pretty-print a stability shelf-life figure ("7 days", "2 weeks"). */
export function formatRoundTrip(n: number): string {
  if (n === 0) return "0"
  return String(significant(n, 3))
}
