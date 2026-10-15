import { type LaboratoryInputs, parseLaboratoryNumber } from "@/lib/calculations"
type Turn = { role: string; content: string }
type Kind = "mass" | "volume" | "concentration"
const numeric = "[+-]?(?:\\d+(?:[.,]\\d*)?|[.,]\\d+)(?:e[+-]?\\d+)?"
const jsonNumeric = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:e[+-]?\\d+)?"
const mass = "(?:microgram\\p{L}*|mikrogram\\p{L}*|milligram\\p{L}*|[µμu]g|mcg|mg|g)"
const volume =
  "(?:microlit\\p{L}*|mikrolit\\p{L}*|millilit\\p{L}*|[µμu]l|ml|litre\\p{L}*|liter\\p{L}*|litra\\p{L}*|l)"
const massFactor = (unit: string) =>
  /^(?:micro|mikro|[µμu]g|mcg)/i.test(unit) ? 0.001 : unit.toLowerCase() === "g" ? 1000 : 1
const volumeFactor = (unit: string) =>
  /^(?:micro|mikro|[µμu]l)/i.test(unit) ? 0.001 : /^(?:l$|lit)/i.test(unit) ? 1000 : 1
const fields = {
  massMg: { kind: "mass", factor: 1 },
  aliquotMcg: { kind: "mass", factor: 0.001 },
  finalVolumeMl: { kind: "volume", factor: 1 },
  stockMgPerMl: { kind: "concentration", factor: 1 },
  targetMgPerMl: { kind: "concentration", factor: 1 },
} as const
const required = {
  concentration: ["massMg", "finalVolumeMl"],
  volume: ["massMg", "targetMgPerMl"],
  dilution: ["stockMgPerMl", "targetMgPerMl", "finalVolumeMl"],
  aliquots: ["massMg", "finalVolumeMl", "aliquotMcg"],
} as const

/** Agent calculations require quantities supplied by the user, never invented examples. */
export function missingUserQuantities(
  input: LaboratoryInputs,
  transcript: Turn[] | undefined,
  locale: string,
): string[] {
  // Direct library callers may supply trusted normalized inputs without a chat.
  if (!transcript) return []
  const quantities: Array<{ kind: Kind; value: number }> = []
  for (const turn of transcript.filter((turn) => turn.role === "user")) {
    const expression = new RegExp(
      `(?<![\\w.+-])(${numeric})\\s*(${mass})(?:\\s*\\/\\s*(${volume}))?(?![\\p{L}])|(?<![\\w.+-])(${numeric})\\s*(${volume})(?![\\p{L}])`,
      "giu",
    )
    for (const match of turn.content.matchAll(expression)) {
      const number = parseLaboratoryNumber(match[1] ?? match[4] ?? "", locale)
      if (number === null) continue
      if (match[2])
        quantities.push({
          kind: match[3] ? "concentration" : "mass",
          value: (number * massFactor(match[2])) / (match[3] ? volumeFactor(match[3]) : 1),
        })
      else quantities.push({ kind: "volume", value: number * volumeFactor(match[5] ?? "mL") })
    }
    // The calculator handoff deliberately supplies normalized, named JSON fields.
    const structured = new RegExp(
      `"?(massMg|aliquotMcg|finalVolumeMl|stockMgPerMl|targetMgPerMl)"?\\s*:\\s*(${jsonNumeric})`,
      "g",
    )
    for (const match of turn.content.matchAll(structured)) {
      const field = fields[match[1] as keyof typeof fields]
      const number = parseLaboratoryNumber(match[2] ?? "", locale)
      if (field && number !== null)
        quantities.push({ kind: field.kind, value: number * field.factor })
    }
  }
  return required[input.mode].filter((name) => {
    const supplied = input[name]
    const field = fields[name]
    if (supplied === undefined) return true
    const index = quantities.findIndex(
      (quantity) =>
        quantity.kind === field.kind &&
        Math.abs(quantity.value - supplied * field.factor) <=
          1e-8 * Math.max(Math.abs(quantity.value), Math.abs(supplied * field.factor), 1e-12),
    )
    if (index < 0) return true
    quantities.splice(index, 1)
    return false
  })
}
