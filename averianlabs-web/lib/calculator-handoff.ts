import {
  type CalculationMode,
  type LaboratoryInputs,
  calculateLaboratory,
} from "@/lib/calculations"
export function readCalculationHandoff(
  params: Record<string, string | string[] | undefined>,
): LaboratoryInputs | undefined {
  const mode = params.mode
  if (
    typeof mode !== "string" ||
    !["concentration", "volume", "dilution", "aliquots"].includes(mode)
  )
    return undefined
  const inputs: LaboratoryInputs = { mode: mode as CalculationMode }
  for (const key of [
    "massMg",
    "finalVolumeMl",
    "aliquotMcg",
    "stockMgPerMl",
    "targetMgPerMl",
  ] as const) {
    if (typeof params[key] === "string") inputs[key] = Number(params[key])
  }
  return calculateLaboratory(inputs) ? inputs : undefined
}
