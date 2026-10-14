/** Laboratory quantities. All public results use normalized mg and mL. */
export const CALCULATION_VERSION = "laboratory-v2"
export type CalculationMode = "concentration" | "volume" | "dilution" | "aliquots"
export type MassUnit = "mg" | "mcg"
export type VolumeUnit = "mL" | "uL"
export type ConcentrationUnit = "mg/mL" | "mcg/mL"
export type CalculationError =
  | "incomplete"
  | "invalid"
  | "range"
  | "aliquotTooLarge"
  | "targetTooHigh"
const MIN = 1e-12
const MAX = 1e12
const positive = (n: number) => Number.isFinite(n) && n >= MIN && n <= MAX

/** No thousands separators: a comma is a decimal separator only in comma locales. */
export function parseLaboratoryNumber(raw: string, locale = "en"): number | null {
  const s = raw.trim()
  if (!s || (!/^(fi|de|sv|nl)(-|$)/.test(locale) && s.includes(","))) return null
  if (!/^[+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(s)) return null
  const n = Number(s.replace(",", "."))
  return positive(n) ? n : null
}
export const massToMg = (n: number, unit: MassUnit) => (unit === "mcg" ? n / 1000 : n)
export const volumeToMl = (n: number, unit: VolumeUnit) => (unit === "uL" ? n / 1000 : n)
export const concentrationToMgMl = (n: number, unit: ConcentrationUnit) =>
  unit === "mcg/mL" ? n / 1000 : n

export function calculateConcentration(massMg: number, finalVolumeMl: number) {
  if (![massMg, finalVolumeMl].every(positive)) return null
  const concentrationMgPerMl = massMg / finalVolumeMl
  const concentrationMcgPerMl = concentrationMgPerMl * 1000
  if (![concentrationMgPerMl, concentrationMcgPerMl].every(positive)) return null
  return { concentrationMgPerMl, concentrationMcgPerMl }
}
export function calculateTargetVolume(massMg: number, targetMgPerMl: number) {
  if (![massMg, targetMgPerMl].every(positive)) return null
  const finalVolumeMl = massMg / targetMgPerMl
  const finalVolumeUl = finalVolumeMl * 1000
  if (![finalVolumeMl, finalVolumeUl].every(positive)) return null
  return { finalVolumeMl, finalVolumeUl }
}
export function calculateDilution(
  stockMgPerMl: number,
  targetMgPerMl: number,
  finalVolumeMl: number,
) {
  if (![stockMgPerMl, targetMgPerMl, finalVolumeMl].every(positive) || targetMgPerMl > stockMgPerMl)
    return null
  const stockVolumeMl = (targetMgPerMl / stockMgPerMl) * finalVolumeMl
  const makeUpVolumeMl = finalVolumeMl - stockVolumeMl
  if (!positive(stockVolumeMl) || !Number.isFinite(makeUpVolumeMl) || makeUpVolumeMl < 0)
    return null
  return { stockVolumeMl, stockVolumeUl: stockVolumeMl * 1000, finalVolumeMl, makeUpVolumeMl }
}
export function calculateAliquots(massMg: number, volumeMl: number, aliquotMcg: number) {
  if (![massMg, volumeMl, aliquotMcg].every(positive)) return null
  const c = calculateConcentration(massMg, volumeMl)
  if (!c) return null
  const aliquotMassMg = aliquotMcg / 1000
  const ratio = massMg / aliquotMassMg
  // Correct roundoff at an integer boundary, without rounding a partial aliquot up.
  const nearest = Math.round(ratio)
  const aliquotCount = Math.floor(
    Math.abs(ratio - nearest) <= Number.EPSILON * Math.max(1, ratio) * 2 ? nearest : ratio,
  )
  const aliquotVolumeMl = (aliquotMassMg / massMg) * volumeMl
  const aliquotVolumeUl = aliquotVolumeMl * 1000
  if (
    ![aliquotVolumeMl, aliquotVolumeUl].every(positive) ||
    !Number.isSafeInteger(aliquotCount) ||
    aliquotCount < 1
  )
    return null
  return { ...c, aliquotVolumeMl, aliquotVolumeUl, aliquotCount }
}

export interface LaboratoryInputs {
  mode: CalculationMode
  massMg?: number
  finalVolumeMl?: number
  aliquotMcg?: number
  stockMgPerMl?: number
  targetMgPerMl?: number
}
export interface LaboratoryResult {
  version: string
  inputs: LaboratoryInputs
  values: Record<string, number>
  formula: string
}
export function calculateLaboratory(inputs: LaboratoryInputs): LaboratoryResult | null {
  let values: Record<string, number> | null
  let formula: string
  switch (inputs.mode) {
    case "concentration":
      values = calculateConcentration(inputs.massMg ?? 0, inputs.finalVolumeMl ?? 0)
      formula = "c = m / V"
      break
    case "volume":
      values = calculateTargetVolume(inputs.massMg ?? 0, inputs.targetMgPerMl ?? 0)
      formula = "V = m / c"
      break
    case "dilution":
      values = calculateDilution(
        inputs.stockMgPerMl ?? 0,
        inputs.targetMgPerMl ?? 0,
        inputs.finalVolumeMl ?? 0,
      )
      formula = "c₁ × V₁ = c₂ × V₂"
      break
    case "aliquots": {
      const result = calculateAliquots(
        inputs.massMg ?? 0,
        inputs.finalVolumeMl ?? 0,
        inputs.aliquotMcg ?? 0,
      )
      values = result
        ? {
            ...result,
            remainingMassMcg: Math.max(
              0,
              (inputs.massMg ?? 0) * 1000 - result.aliquotCount * (inputs.aliquotMcg ?? 0),
            ),
            remainingVolumeMl: Math.max(
              0,
              (inputs.finalVolumeMl ?? 0) - result.aliquotCount * result.aliquotVolumeMl,
            ),
          }
        : null
      formula = "c = m / V; Vₐ = mₐ / c; N = floor(m / mₐ)"
      break
    }
    default:
      return null
  }
  if (!values || Object.values(values).some((n) => !Number.isFinite(n) || n < 0 || n > MAX))
    return null
  return { version: CALCULATION_VERSION, inputs, values, formula }
}
