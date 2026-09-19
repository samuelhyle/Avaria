/**
 * getReconstitution — math for reconstituting a research peptide vial.
 *
 * Tool wrapper around `lib/calculator/reconstitution.solveReconstitution`.
 * The math lives in one place; the tool layer only adds the JSON schema
 * the model uses, the input validation that protects us from hallucinated
 * tool calls, and the result shape we render back to the model.
 */

import {
  MAX_PEPTIDE_RATIO_MG_PER_ML,
  solveReconstitution,
} from "@/lib/calculator/reconstitution"
import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { DEFAULT_SYRINGE } from "@/lib/calculator/syringe"

interface Args {
  vialMg: number
  solventMl: number
  doseMcg: number
  syringeIuPerMl?: number
}

export const reconstitutionTool: Tool = {
  definition: {
    name: "getReconstitution",
    description:
      "Compute the volume to draw for a given reconstitution scenario. Inputs: peptide mass (mg), solvent volume (mL), desired dose (mcg). Optional syringe IU per mL (default 100 IU/mL for 1 mL insulin syringes). Returns concentration, volume per dose, IU per dose, and total doses remaining.",
    parameters: {
      type: "object",
      properties: {
        vialMg: { type: "number", description: "Mass of peptide in the vial, in milligrams." },
        solventMl: {
          type: "number",
          description: "Volume of bacteriostatic water added, in milliliters.",
        },
        doseMcg: { type: "number", description: "Target dose per draw, in micrograms." },
        syringeIuPerMl: {
          type: "number",
          description:
            "IU per mL on the syringe (default 100). 1 mL insulin syringe = 100 IU; 0.5 mL = 50 IU.",
        },
      },
      required: ["vialMg", "solventMl", "doseMcg"],
    },
  },
  async execute(rawArgs, _ctx: ToolContext): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    const { vialMg, solventMl, doseMcg, syringeIuPerMl = DEFAULT_SYRINGE.iuPerMl } = args
    if (![vialMg, solventMl, doseMcg, syringeIuPerMl].every((v) => Number.isFinite(v) && v > 0)) {
      return { content: { error: "invalid_inputs" } }
    }
    if (syringeIuPerMl > 1000) {
      // Defensive — real syringes top out at ~100 IU/mL. Past that the answer
      // is almost certainly a hallucinated tool call.
      return { content: { error: "invalid_inputs", field: "syringeIuPerMl" } }
    }
    if (vialMg / solventMl > MAX_PEPTIDE_RATIO_MG_PER_ML) {
      return { content: { error: "invalid_inputs", field: "concentration", maxRatio: MAX_PEPTIDE_RATIO_MG_PER_ML } }
    }

    const syringe = { ...DEFAULT_SYRINGE, iuPerMl: syringeIuPerMl }
    const r = solveReconstitution({ vialMg, solventMl, doseMcg, syringe })
    if (r.invalid) {
      return { content: { error: "invalid_inputs", reason: r.invalid.reason, fields: r.invalid.fields } }
    }

    return {
      content: {
        inputs: { vialMg, solventMl, doseMcg, syringeIuPerMl },
        concentration: {
          mgPerMl: r.concentrationMgPerMl,
          mcgPerMl: r.concentrationMcgPerMl,
        },
        perDose: {
          volumeMl: r.volumePerDoseMl,
          iu: r.iuPerDose,
          iuSnapped: r.iuPerDoseSnapped,
          volumeMlSnapped: r.volumePerDoseMlSnapped,
        },
        dosesRemaining: r.totalDoses,
        leftoverMcg: r.leftoverMcg,
        reminder:
          "For research/laboratory contexts only. Verify calculations against your protocol and lab SOPs.",
      },
    }
  },
}
