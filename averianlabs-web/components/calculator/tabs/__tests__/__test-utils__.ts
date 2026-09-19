import { solveReconstitution } from "@/lib/calculator/reconstitution"
import { SYRINGE_PRESETS } from "@/lib/calculator/syringe"
import type { CalculatorFormState } from "@/components/calculator/hooks/use-calculator-state"

export function calculateReconstitution(state: CalculatorFormState) {
  return {
    recon: solveReconstitution({
      vialMg: state.vialMg,
      solventMl: state.solventMl,
      doseMcg: state.doseMcg,
      syringe: state.syringe,
    }),
    valid: true,
  }
}

export const defaultState: CalculatorFormState = {
  tab: "reconstitution",
  vialMg: 10,
  solventMl: 2,
  doseMcg: 250,
  syringe: SYRINGE_PRESETS[2]!,
  productSlug: "bpc-157",
  storage: "refrigerated_2to8",
  startMcg: 2500,
  endMcg: 15000,
  steps: 6,
  weekCount: 12,
  dosesPerWeek: 5,
  minPracticalDrawMl: 0.05,
}
