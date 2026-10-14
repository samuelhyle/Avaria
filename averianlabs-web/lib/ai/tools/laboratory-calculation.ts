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
      "Calculate laboratory concentration, required final solution volume, dilution or aliquots. Dilution REQUIRES stockMgPerMl, targetMgPerMl AND finalVolumeMl. Concentration requires massMg and finalVolumeMl; volume requires massMg and targetMgPerMl; aliquots requires massMg, finalVolumeMl and aliquotMcg. Inputs are normalized mg, mL, micrograms and mg/mL. Ask for missing inputs and units; final solution volume is not added solvent. If missing_inputs is returned, retry with the values already explicitly supplied by the user; ask only for quantities the user has not provided. Never replace a failed tool calculation with manual arithmetic.",
    parameters: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["concentration", "volume", "dilution", "aliquots"] },
        massMg: { type: "number" },
        finalVolumeMl: {
          type: "number",
          description:
            "REQUIRED for dilution, concentration and aliquots. Final solution volume in mL, as explicitly supplied by the user.",
        },
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
    const required: Record<string, Array<keyof typeof parsed.data>> = {
      concentration: ["massMg", "finalVolumeMl"],
      volume: ["massMg", "targetMgPerMl"],
      dilution: ["stockMgPerMl", "targetMgPerMl", "finalVolumeMl"],
      aliquots: ["massMg", "finalVolumeMl", "aliquotMcg"],
    }
    const missing =
      required[parsed.data.mode]?.filter((key) => parsed.data[key] === undefined) ?? []
    if (missing.length)
      return {
        content: {
          error: "missing_inputs",
          missing,
          inputs: parsed.data,
          recovery:
            "Retry this tool with all required values explicitly supplied by the user. Do not invent a value or perform manual arithmetic. If a required value was not supplied, ask the user for it.",
        },
      }
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
