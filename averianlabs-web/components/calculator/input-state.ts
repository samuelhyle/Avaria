import type { LaboratoryInputs } from "@/lib/calculations"

export type CalculationField = "mass" | "volume" | "aliquot" | "stock" | "target"
export type InputOrigin = "example" | "catalogue" | "transferred" | "user" | "saved"

/** A partial sourced input must never acquire an unrelated example quantity. */
export function calculationFields(initial?: LaboratoryInputs): Record<CalculationField, string> {
  const values = initial ?? {
    massMg: 10,
    finalVolumeMl: 2,
    aliquotMcg: 250,
    stockMgPerMl: 5,
    targetMgPerMl: 1,
  }
  const value = (n: number | undefined) => (n === undefined ? "" : String(n))
  return {
    mass: value(values.massMg),
    volume: value(values.finalVolumeMl),
    aliquot: value(values.aliquotMcg),
    stock: value(values.stockMgPerMl),
    target: value(values.targetMgPerMl),
  }
}

export function calculationOrigins(
  initial: LaboratoryInputs | undefined,
  source: boolean,
  saved = false,
): Record<CalculationField, InputOrigin> {
  const origin = saved ? "saved" : initial ? "transferred" : "example"
  return {
    mass: source && !saved ? "catalogue" : origin,
    volume: origin,
    aliquot: origin,
    stock: origin,
    target: origin,
  }
}
