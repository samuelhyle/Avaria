import { type LaboratoryInputs, calculateLaboratory } from "@/lib/calculations"
/** Targeted numerical check; explanations are still subject to editorial evaluation. */
export function calculationProseWarnings(
  text: string,
  sourceInputs: LaboratoryInputs | LaboratoryInputs[],
  locale: string,
): string[] {
  const calculations = (Array.isArray(sourceInputs) ? sourceInputs : [sourceInputs])
    .map(calculateLaboratory)
    .filter((value) => value !== null)
  if (!calculations.length) return []
  const masses = calculations.flatMap(({ inputs, values: v }) => [
    inputs.massMg,
    inputs.aliquotMcg === undefined ? undefined : inputs.aliquotMcg / 1000,
    v.remainingMassMcg === undefined ? undefined : v.remainingMassMcg / 1000,
  ])
  const volumes = calculations.flatMap(({ inputs, values: v }) => [
    inputs.finalVolumeMl,
    v.finalVolumeMl,
    v.stockVolumeMl,
    v.makeUpVolumeMl,
    v.aliquotVolumeMl,
    v.remainingVolumeMl,
  ])
  const concentrations = calculations.flatMap(({ inputs, values: v }) => [
    inputs.stockMgPerMl,
    inputs.targetMgPerMl,
    v.concentrationMgPerMl,
  ])
  const warnings = []
  const expression =
    /((?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,]\d+)?(?:e[+-]?\d+)?)\s*(mg\/m[Ll]|[µμ]g\/m[Ll]|mcg\/m[Ll]|mg|[µμ]g|mcg|m[Ll]|[µμ][Ll]|u[Ll])\b/g
  for (const match of text.matchAll(expression)) {
    const raw = (match[1] ?? "").replace(/[ \u00a0\u202f]/g, "")
    const unit = match[2] ?? ""
    const value = Number(
      locale === "en" && /^\d{1,3}(,\d{3})+$/.test(raw)
        ? raw.replaceAll(",", "")
        : raw.replace(",", "."),
    )
    const micro = /^[µμ]|^mcg|^uL/.test(unit)
    const normalized = micro ? value / 1000 : value
    const allowed = unit.includes("/") ? concentrations : /[Ll]$/.test(unit) ? volumes : masses
    // Basic unit equivalences may appear in the explanation.
    const equivalence =
      /1\s*(?:mg|m[Ll])\s*(?:=|equals|vastaa)\s*(?:1000|1[ \u00a0]000)\s*(?:[µμ]g|mcg|[µμ][Ll])/.test(
        text,
      )
    if (equivalence && normalized === 1 && !unit.includes("/")) continue
    if (
      !allowed.some(
        (n) => n !== undefined && Math.abs(n - normalized) <= 1e-8 * Math.max(Math.abs(n), 1e-12),
      )
    )
      warnings.push(`calculation_prose_mismatch:${unit}`)
  }
  return [...new Set(warnings)]
}
