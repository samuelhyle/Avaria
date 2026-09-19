/**
 * `lib/calculator/breakeven.ts` — compare vial plans against a target dose plan.
 *
 * Use case: "I need 300 mg total peptide across 4 weeks at 250 mcg, 5 doses
 * per week. Which combination of vials is cheapest per mg AND wastes the
 * least leftover peptide?"
 *
 * The user provides a list of candidate plans (vial size + number of vials),
 * the module returns per-mg cost, total peptide purchased, leftover mg,
 * and how many full doses the plan covers.
 */

import { vialYield } from "@/lib/calculator/reconstitution"
import { roundLiquid } from "@/lib/calculator/round"

export interface VialPlanInput {
  /** Display label, e.g. "1× 50 mg vial". */
  label: string
  /** Vial mass in mg. */
  vialMg: number
  /** Number of vials in this plan. */
  vials: number
  /** Cost per vial in cents (integer). */
  priceCents: number
}

export interface VialPlanResult extends VialPlanInput {
  /** Total peptide purchased, in mg. */
  totalMg: number
  /** Sum paid for the plan, in cents. */
  totalCents: number
  /** Cents per mg. */
  centsPerMg: number
  /** Total doses covered at the target dose. */
  dosesCovered: number
  /** mg leftover after every dose is drawn. */
  leftoverMg: number
  /** Cents worth of peptide wasted at the leftover (priceCents × leftover / vialMg). */
  wastedCents: number
}

export interface BreakevenInputs {
  plans: VialPlanInput[]
  doseMcg: number
}

export interface BreakevenResult {
  plans: VialPlanResult[]
  /** The plan with the lowest cents-per-mg. */
  cheapest: VialPlanResult | null
  /** The plan with the smallest leftover mg. */
  leastWaste: VialPlanResult | null
  /** True when every plan covers the same number of doses (rare). */
  identicalCoverage: boolean
}

export function compareVialPlans(input: BreakevenInputs): BreakevenResult {
  if (!Number.isFinite(input.doseMcg) || input.doseMcg <= 0 || input.plans.length === 0) {
    return { plans: [], cheapest: null, leastWaste: null, identicalCoverage: true }
  }
  const plans = input.plans.map((plan): VialPlanResult => {
    const totalMg = plan.vialMg * plan.vials
    const doses = vialYield(totalMg, input.doseMcg) // Math.floor(total mcg / dose mcg)
    const usedMg = (doses * input.doseMcg) / 1000
    const leftoverMg = roundLiquid(totalMg - usedMg, 3)
    const totalCents = plan.priceCents * plan.vials
    const wastedCents = Math.round((leftoverMg / plan.vialMg) * plan.priceCents)
    return {
      ...plan,
      totalMg,
      totalCents,
      centsPerMg: roundLiquid(totalCents / totalMg, 2),
      dosesCovered: doses,
      leftoverMg,
      wastedCents,
    }
  })

  const sortedByCost = [...plans].sort((a, b) => a.centsPerMg - b.centsPerMg)
  const sortedByWaste = [...plans].sort((a, b) => a.leftoverMg - b.leftoverMg)
  const identical = plans.every((p) => p.dosesCovered === plans[0]?.dosesCovered)
  return {
    plans,
    cheapest: sortedByCost[0] ?? null,
    leastWaste: sortedByWaste[0] ?? null,
    identicalCoverage: identical,
  }
}
