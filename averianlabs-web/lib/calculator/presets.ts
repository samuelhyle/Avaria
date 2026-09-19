/**
 * `lib/calculator/presets.ts` — bundle the calculator's defaults + the
 * catalogue's "common starts".
 *
 * Used by:
 *   - <Calculator> on first paint to populate the form
 *   - <VialPresetGrid> to render the catalog-aware picker
 *   - the in-page empty state to suggest real research workflows
 */

import { RECONSTITUTION_PRESETS, type ReconstitutionPreset } from "@/lib/calculator/reconstitution"
import { SYRINGE_PRESETS } from "@/lib/calculator/syringe"

export const DEFAULT_RECONSTITUTION_PRESET: ReconstitutionPreset =
  RECONSTITUTION_PRESETS[0]!

export const DEFAULT_SYRINGE_KEY: string = "1ml-100iu"

export { SYRINGE_PRESETS, RECONSTITUTION_PRESETS }

export interface TitratedPreset {
  id: string
  label: string
  description: string
  vialMg: number
  solventMl: number
  startMcg: number
  endMcg: number
  steps: number
  notes?: string
}

/**
 * Common research protocols pegged to specific catalog products. Numbers
 * come from typical published protocols cited in the chat-persona QA reports.
 */
export const TITRATION_PRESETS: readonly TitratedPreset[] = [
  {
    id: "tirz-6week",
    label: "Tirzepatide · 6-week titration",
    description: "2.5 mg → 15 mg over 6 weeks, one dose per week.",
    vialMg: 30,
    solventMl: 2,
    startMcg: 2500,
    endMcg: 15000,
    steps: 6,
    notes: "Step duration is a single dose, ramped weekly.",
  },
  {
    id: "reta-8week",
    label: "Retatrutide · 8-week titration",
    description: "1 mg → 8 mg over 8 weeks, one dose per week.",
    vialMg: 20,
    solventMl: 2,
    startMcg: 1000,
    endMcg: 8000,
    steps: 8,
  },
  {
    id: "bpc-recovery",
    label: "BPC-157 · weekly recovery plan",
    description: "Hold a 250 mcg dose across 12 weeks.",
    vialMg: 10,
    solventMl: 3,
    startMcg: 250,
    endMcg: 250,
    steps: 12,
    notes: "Same dose every period — useful for total peptide budget planning.",
  },
] as const

export interface BreakevenPresetPlan {
  label: string
  vialMg: number
  vials: number
  priceCents: number
}

export interface BreakevenPreset {
  id: string
  label: string
  description: string
  plans: BreakevenPresetPlan[]
  /** Default dose in mcg for the suggestion. */
  doseMcg: number
}

export const BREAKEVEN_PRESETS: readonly BreakevenPreset[] = [
  {
    id: "bpc-recovery-plan",
    label: "BPC-157 · 3-month recovery plan",
    description:
      "Compare 1× 10 mg vial weekly vs 2× 5 mg vials biweekly for 12 weeks at 250 mcg, 5 doses/week.",
    plans: [
      { label: "1× 10 mg vial weekly", vialMg: 10, vials: 12, priceCents: 6900 },
      { label: "2× 5 mg vials biweekly", vialMg: 5, vials: 24, priceCents: 3990 },
    ],
    doseMcg: 250,
  },
  {
    id: "retatrutide-3month",
    label: "Retatrutide · 3-month supply",
    description: "Compare 1× 30 mg vs 3× 20 mg for 12 weeks at 4 mg / week.",
    plans: [
      { label: "1× 30 mg vial monthly", vialMg: 30, vials: 3, priceCents: 14900 },
      { label: "3× 20 mg vials monthly", vialMg: 20, vials: 9, priceCents: 9900 },
    ],
    doseMcg: 4000,
  },
] as const
