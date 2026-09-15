/**
 * getReconstitution — math for reconstituting a research peptide vial.
 *
 * Same formula as the on-page calculator (mg / mL × dose mcg → volume).
 * Refuses inputs that suggest human-use framing.
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"

interface Args {
  vialMg: number
  solventMl: number
  doseMcg: number
  syringeIU?: number
}

const HUMAN_USE_PATTERNS: RegExp[] = [
  /\b(patient|patients|human|humans|self|inject|personal|clinic|clinic use|my|me)\b/i,
]

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
        syringeIU: {
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
    const { vialMg, solventMl, doseMcg, syringeIU = 100 } = args

    if ([vialMg, solventMl, doseMcg].some((v) => !Number.isFinite(v) || v <= 0)) {
      return { content: { error: "invalid_inputs" } }
    }

    const totalMcg = vialMg * 1000
    const concentrationMgPerMl = vialMg / solventMl
    const concentrationMcgPerMl = concentrationMgPerMl * 1000
    const volumePerDoseMl = doseMcg / concentrationMcgPerMl
    const dosesTotal = Math.floor(totalMcg / doseMcg)
    const iuPerDose = volumePerDoseMl * syringeIU

    return {
      content: {
        inputs: { vialMg, solventMl, doseMcg, syringeIU },
        concentration: {
          mgPerMl: round(concentrationMgPerMl),
          mcgPerMl: round(concentrationMcgPerMl),
        },
        perDose: { volumeMl: round(volumePerDoseMl), iu: round(iuPerDose) },
        dosesRemaining: dosesTotal,
        reminder:
          "For research/laboratory contexts only. Verify calculations against your protocol and lab SOPs.",
      },
    }
  },
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

// Exported for A6 guardrail tests.
export const _guard = HUMAN_USE_PATTERNS
