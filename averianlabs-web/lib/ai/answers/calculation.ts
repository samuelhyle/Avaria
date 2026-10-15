import { type LaboratoryInputs, calculateLaboratory } from "@/lib/calculations"
import { toIntlLocale } from "@/lib/utils/format"
import en from "@/messages/en.json"
import fi from "@/messages/fi.json"

/** Numerical prose is rendered from recomputed results, never model-written procedures. */
export function renderLaboratoryAnswer(inputs: LaboratoryInputs[], locale: string): string | null {
  const copy = locale === "fi" ? fi : en
  const labels = copy.calculator
  const number = new Intl.NumberFormat(toIntlLocale(locale), { maximumSignificantDigits: 8 })
  const value = (n: number, unit: string) => `${number.format(n)}${unit ? ` ${unit}` : ""}`
  const lines: string[] = []
  const seen = new Set<string>()
  for (const input of inputs) {
    const calculation = calculateLaboratory(input)
    if (!calculation) continue
    const key = JSON.stringify(calculation)
    if (seen.has(key)) continue
    seen.add(key)
    const mode = calculation.inputs.mode
    const title = mode === "volume" ? labels.targetVolume : labels[mode]
    const values = (key: string) => {
      const n = calculation.values[key]
      if (n === undefined) throw new Error("Laboratory result field missing")
      return n
    }
    const outputs: Array<[string, number, string]> =
      mode === "concentration"
        ? [[labels.concentration, values("concentrationMgPerMl"), "mg/mL"]]
        : mode === "volume"
          ? [[labels.finalVolume, values("finalVolumeMl"), "mL"]]
          : mode === "dilution"
            ? [
                [labels.stockVolume, values("stockVolumeMl"), "mL"],
                [labels.makeUp, values("makeUpVolumeMl"), "mL"],
                [labels.finalVolume, values("finalVolumeMl"), "mL"],
              ]
            : [
                [labels.concentration, values("concentrationMgPerMl"), "mg/mL"],
                [labels.aliquotVolume, values("aliquotVolumeUl"), "µL"],
                [labels.count, values("aliquotCount"), ""],
                [labels.remainingMass, values("remainingMassMcg"), "µg"],
                [labels.remainingVolume, values("remainingVolumeMl"), "mL"],
              ]
    const fields = copy.averia.assistant.inputs
    const units = {
      massMg: "mg",
      finalVolumeMl: "mL",
      aliquotMcg: "µg",
      stockMgPerMl: "mg/mL",
      targetMgPerMl: "mg/mL",
    } as const
    const entered = Object.entries(calculation.inputs).flatMap(([field, n]) => {
      if (field === "mode" || typeof n !== "number") return []
      const name = field as keyof typeof fields
      return [`${fields[name]}: ${value(n, units[name])}`]
    })
    lines.push(
      `**${title}**`,
      "",
      `${copy.research.inputs}: ${entered.join("; ")}.`,
      "",
      ...outputs.map(([label, n, unit]) => `- ${label}: **${value(n, unit)}**`),
      "",
      `${labels.formula}: ${calculation.formula}.`,
      labels.assumptions,
    )
    if (mode === "dilution")
      lines.push(
        locale === "fi"
          ? "Täydennystilavuus olettaa tilavuuksien summautuvan. Valmistuksessa on noudatettava hyväksyttyä tutkimusmenetelmää."
          : "The make-up volume assumes additive volumes. Actual preparation requires an approved research method.",
      )
    lines.push("")
  }
  if (!seen.size) return null
  lines.push(labels.rounding, "", copy.research.researchOnly)
  return lines.join("\n")
}

export function renderMissingCalculationInputs(
  trace: Array<{ name: string; result?: unknown }>,
  locale: string,
) {
  const copy = locale === "fi" ? fi : en
  const labels = copy.averia.assistant.inputs
  const failure = trace.findLast(
    (item) =>
      ["calculateLaboratory", "getReconstitution"].includes(item.name) &&
      Array.isArray((item.result as { missing?: unknown } | undefined)?.missing),
  )
  const missing = (failure?.result as { missing?: unknown[] } | undefined)?.missing ?? []
  const fields = [...new Set(missing)].flatMap((field) =>
    typeof field === "string" && Object.hasOwn(labels, field)
      ? [labels[field as keyof typeof labels]]
      : [],
  )
  if (!fields.length) return null
  return [
    locale === "fi"
      ? "Vahvista seuraavat laskelman lähtötiedot yksiköineen:"
      : "Please confirm these calculation inputs and their units:",
    "",
    ...fields.map((field) => `- ${field}`),
  ].join("\n")
}

export function renderIncompleteCalculation(locale: string): string {
  return locale === "fi"
    ? "Laskelmaa ei voitu vahvistaa. Tarkista lähtötiedot ja yksiköt tai avaa [laboratoriolaskuri](/fi/peptide-calculator)."
    : "The calculation could not be completed. Check the quantities and units, or open the [laboratory calculator](/en/peptide-calculator)."
}
