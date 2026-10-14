import { calculateLaboratory } from "@/lib/calculations"
import { z } from "zod"
import type { Tool } from "./registry"
export const laboratoryInputSchema = z
  .object({
    mode: z.enum(["concentration", "volume", "dilution", "aliquots"]),
    massMg: z.number().finite().positive().optional(),
    finalVolumeMl: z.number().finite().positive().optional(),
    aliquotMcg: z.number().finite().positive().optional(),
    stockMgPerMl: z.number().finite().positive().optional(),
    targetMgPerMl: z.number().finite().positive().optional(),
  })
  .strict()
export const laboratoryCalculationTool: Tool = {
  definition: {
    name: "calculateLaboratory",
    description:
      "Calculate laboratory concentration, required final solution volume, dilution or aliquots. Inputs are normalized mg, mL, micrograms and mg/mL. Ask for missing inputs and units; final solution volume is not the volume of added solvent. Return the exact calculation and its assumptions; no preparation or administration instructions.",
    parameters: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["concentration", "volume", "dilution", "aliquots"] },
        massMg: { type: "number" },
        finalVolumeMl: { type: "number" },
        aliquotMcg: { type: "number" },
        stockMgPerMl: { type: "number" },
        targetMgPerMl: { type: "number" },
      },
      required: ["mode"],
    },
  },
  async execute(raw, ctx) {
    const parsed = laboratoryInputSchema.safeParse(raw)
    if (!parsed.success) return { content: { error: "invalid_inputs" } }
    const calculation = calculateLaboratory(parsed.data)
    if (!calculation) return { content: { error: "invalid_calculation", inputs: parsed.data } }
    return {
      content: {
        calculation,
        assumptions:
          ctx.locale === "fi"
            ? "Laskennallinen massatase ilman hävikkiä. Nimellismäärä ei osoita mitattua sisältöä. Käytä lopullista liuostilavuutta."
            : "Ideal mass balance without loss. Nominal quantity does not establish measured content. Use final solution volume.",
      },
    }
  },
}
