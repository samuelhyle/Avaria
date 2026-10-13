/**
 * getReconstitution — math for reconstituting a research peptide vial.
 *
 * Same formula as the on-page calculator (mg / mL × dose mcg → volume).
 * Refuses inputs that suggest human-use framing.
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { calculateAliquots } from "@/lib/calculations"
interface Args {
  vialMg: number
  solventMl: number
  aliquotMcg: number
}

const HUMAN_USE_PATTERNS: RegExp[] = [
  /\b(patient|patients|human|humans|self|inject|personal|clinic|clinic use|my|me)\b/i,
]

export const reconstitutionTool: Tool = {
  definition: {
    name: "getReconstitution",
    description:
      "Calculate laboratory solution concentration and aliquot volume from material mass (mg), solution volume (mL) and mass per aliquot (micrograms). Does not determine biological activity, syringe units or an administration dose.",
    parameters: {
      type: "object",
      properties: {
        vialMg: { type: "number" },
        solventMl: { type: "number" },
        aliquotMcg: { type: "number" },
      },
      required: ["vialMg", "solventMl", "aliquotMcg"],
    },
  },
  async execute(rawArgs, _ctx: ToolContext): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    const result = calculateAliquots(args.vialMg, args.solventMl, args.aliquotMcg)
    if (!result) return { content: { error: "invalid_inputs" } }
    return {
      content: {
        inputs: args,
        ...result,
        reminder:
          _ctx.locale === "fi"
            ? "Laboratoriolaskelma. Tarkista tulos tutkimusmenetelmäsi mukaisesti."
            : "Laboratory calculation. Verify against your research protocol.",
      },
    }
  },
}

// Exported for A6 guardrail tests.
export const _guard = HUMAN_USE_PATTERNS
