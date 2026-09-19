/**
 * `lib/calculator/dilution.ts` — serial dilution chain designer.
 *
 * Some reconstitution scenarios produce draws so small (≤ 0.02 mL on a 1 mL /
 * 100 IU syringe) that even an experienced bench researcher can't pipette
 * them accurately. A "serial dilution" lowers the working concentration by
 * pre-diluting an aliquot of the reconstituted solution into a second vial
 * (or larger syringe), making each draw a more manageable volume.
 *
 * The strategy:
 *
 *   1. Start with the reconstituted vial: `working_conc_mg_per_ml = vialMg / solventMl`
 *   2. Pick the smallest syringe whose resolution hits the desired dose
 *      at a sample-able volume (≥ 0.05 mL on a 1 mL / 100 IU syringe).
 *   3. If the syringe draw is still too small, recommend a 1:N secondary
 *      dilution: take `working_mL` mL of the reconstituted vial + buffer to
 *      reach `working_mL * N` mL total in a new vial/syringe.
 *
 * The chain can't span more than 2 steps in 99% of bench workflows, so
 * we cap at 2.
 */

import { DEFAULT_SYRINGE, type SyringeSpec, smallestSyringeFor } from "@/lib/calculator/syringe"
import { roundLiquid } from "@/lib/calculator/round"
import { solveReconstitution } from "@/lib/calculator/reconstitution"

export type DilutionWarning =
  | "ok"
  | "no_dilution_needed"
  | "draw_within_syringe_resolution"
  | "dilution_required"
  | "excessive_dilution"
  | "impossible"

export interface DilutionStep {
  /** Sequential step number (1 = from the reconstituted vial). */
  index: number
  /** Optional human-readable label, e.g. "1:10 secondary dilution". */
  label: string
  /** mL of source solution pulled into the next vial at this step. */
  sourceMl: number
  /** mL of diluent (BAC water or sterile water) added at this step. */
  diluentMl: number
  /** Resulting working concentration in mg/mL after this step. */
  concentrationMgPerMl: number
  /** Resulting working concentration in mcg/mL after this step. */
  concentrationMcgPerMl: number
}

export interface DilutionPlan {
  warning: DilutionWarning
  /** Minimum draw volume the user can pipette accurately on the chosen syringe. */
  minPracticalDrawMl: number
  /** Recommended syringe for the final step. */
  syringe: SyringeSpec
  steps: DilutionStep[]
  /**
   * Total dilution factor (vial_mg_per_ml ÷ working_mg_per_ml at the final
   * step). 1 = no dilution needed; 10 = a 1:10 chain.
   */
  totalDilutionFactor: number
}

export interface DilutionInputs {
  vialMg: number
  solventMl: number
  doseMcg: number
  syringe?: SyringeSpec
  /**
   * Lowest draw volume, in mL, the user is comfortable pipetting. Defaults
   * to 0.05 mL (5 IU on a 1 mL / 100 IU syringe). Anything smaller usually
   * requires dilution.
   */
  minPracticalDrawMl?: number
  /**
   * Cap on the secondary dilution factor. Real workflows max out around 1:20
   * because the working solution's stability tanks beyond that — at 1:50 the
   * peptide is usually below its solubility floor and crashes out. Default 20.
   */
  maxDilutionFactor?: number
}

const DEFAULT_MIN_DRAW_ML = 0.05
const DEFAULT_MAX_FACTOR = 20

/**
 * Build a dilution plan for a reconstitution scenario where the draw is too
 * small to pipette accurately. When the draw is already >= minPracticalDrawMl,
 * the plan is a single "no dilution needed" step.
 */
export function designDilution(input: DilutionInputs): DilutionPlan {
  const syringe = input.syringe ?? DEFAULT_SYRINGE
  const minDraw = input.minPracticalDrawMl ?? DEFAULT_MIN_DRAW_ML
  const maxFactor = input.maxDilutionFactor ?? DEFAULT_MAX_FACTOR
  const recon = solveReconstitution({
    vialMg: input.vialMg,
    solventMl: input.solventMl,
    doseMcg: input.doseMcg,
    syringe,
  })

  if (recon.invalid) {
    return {
      warning: "impossible",
      minPracticalDrawMl: minDraw,
      syringe,
      totalDilutionFactor: 1,
      steps: [],
    }
  }

  if (recon.volumePerDoseMl >= minDraw) {
    return {
      warning: "no_dilution_needed",
      minPracticalDrawMl: minDraw,
      syringe,
      totalDilutionFactor: 1,
      steps: [
        {
          index: 1,
          label: "Reconstituted vial",
          sourceMl: 0,
          diluentMl: 0,
          concentrationMgPerMl: recon.concentrationMgPerMl,
          concentrationMcgPerMl: recon.concentrationMcgPerMl,
        },
      ],
    }
  }

  // Find a dilution factor `N` such that drawing 1 mL of working
  // solution × N + diluent brings each draw above `minDraw` mL.
  // working_conc = vial_conc / N
  // working_draw_ml = dose_mcg / working_conc_mcg_per_ml = dose_mcg × N / vial_conc_mcg_per_ml
  // We want working_draw_ml >= minDraw ⇒ N >= minDraw × vial_conc_mcg_per_ml / dose_mcg
  const vialConcMcgPerMl = recon.concentrationMcgPerMl
  if (vialConcMcgPerMl <= 0) {
    return {
      warning: "impossible",
      minPracticalDrawMl: minDraw,
      syringe,
      totalDilutionFactor: 1,
      steps: [],
    }
  }
  const requiredN = (minDraw * vialConcMcgPerMl) / input.doseMcg
  // Round up to the next "clean" dilution factor (1:5, 1:10, 1:20).
  const cleanFactors = [5, 10, 20, 50, 100]
  let factor = cleanFactors.find((n) => n >= requiredN) ?? null
  if (factor === null) factor = Math.min(Math.ceil(requiredN), maxFactor)
  if (factor < 1) factor = 1
  if (factor > maxFactor) {
    return {
      warning: "excessive_dilution",
      minPracticalDrawMl: minDraw,
      syringe: smallestSyringeFor(recon.volumePerDoseMl * maxFactor),
      totalDilutionFactor: maxFactor,
      steps: [
        {
          index: 1,
          label: "Reconstituted vial",
          sourceMl: 0,
          diluentMl: 0,
          concentrationMgPerMl: recon.concentrationMgPerMl,
          concentrationMcgPerMl: recon.concentrationMcgPerMl,
        },
      ],
    }
  }

  // Build a 1:factor chain: 1 mL of reconstituted vial + (factor-1) mL diluent.
  const sourceMl = 1
  const diluentMl = factor - 1
  const workingConcentrationMcgPerMl = vialConcMcgPerMl / factor
  const workingConcentrationMgPerMl = recon.concentrationMgPerMl / factor
  const workingDrawMl = roundLiquid(input.doseMcg / workingConcentrationMcgPerMl, 4)
  const finalSyringe = smallestSyringeFor(workingDrawMl)
  return {
    warning: "dilution_required",
    minPracticalDrawMl: minDraw,
    syringe: finalSyringe,
    totalDilutionFactor: factor,
    steps: [
      {
        index: 1,
        label: "Reconstituted vial",
        sourceMl: 0,
        diluentMl: 0,
        concentrationMgPerMl: roundLiquid(recon.concentrationMgPerMl, 3),
        concentrationMcgPerMl: roundLiquid(recon.concentrationMcgPerMl, 1),
      },
      {
        index: 2,
        label: `1:${factor} secondary dilution`,
        sourceMl: roundLiquid(sourceMl, 3),
        diluentMl: roundLiquid(diluentMl, 3),
        concentrationMgPerMl: roundLiquid(workingConcentrationMgPerMl, 4),
        concentrationMcgPerMl: roundLiquid(workingConcentrationMcgPerMl * 1000, 2),
      },
    ],
  }
}

/**
 * Recommend the smallest syringe that gives the *final* draw volume at
 * least one full-tick of resolution. Returns the same syringe as `designDilution`
 * once it's needed.
 */
export function recommendSyringeForDilution(plan: DilutionPlan): SyringeSpec {
  return plan.syringe
}
