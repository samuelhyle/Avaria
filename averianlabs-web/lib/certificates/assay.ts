import type { CertificateTest } from "./types"

/**
 * Reading a certificate as numbers.
 *
 * A certificate reports results as the laboratory wrote them: "99.400 % area"
 * against a specification of "≥ 98.0 % area", "2.1 EU/mg" against "≤ 2.4
 * EU/mg", "Identity confirmed" against "Identity confirmed".
 *
 * A chart can only draw those if it knows which way each comparison runs and
 * what the numbers mean, so the strings are parsed here — once, in one place,
 * where the result can be checked. Nothing is inferred: a specification that
 * cannot be read yields no scale and the row is shown as text.
 */

/** Which way the specification compares. */
export type AssayBound = "lower" | "upper" | "exact" | "none"

export interface AssayScale {
  min: number
  max: number
}

export interface AssayReading {
  id: string
  name: string
  method: string | null
  /** The result exactly as the laboratory reported it. */
  result: string
  /** The specification exactly as the laboratory reported it. */
  spec: string | null
  pass: boolean
  performedAt: string
  /** "lower" for a floor (≥), "upper" for a ceiling (≤), "exact" for equality. */
  bound: AssayBound
  /** The number the result reports, when it reports one. */
  value: number | null
  /** The number the specification sets, when it sets one. */
  limit: number | null
  /** The unit both numbers are in, when both carry one. */
  unit: string | null
  /** The range a bar is drawn over, when the reading has one. */
  scale: AssayScale | null
}

/** The comparison symbols a specification can be written with. */
const BOUND_SIGNS: Array<{ sign: string; bound: AssayBound }> = [
  { sign: "≥", bound: "lower" },
  { sign: "≧", bound: "lower" },
  { sign: ">", bound: "lower" },
  { sign: "≤", bound: "upper" },
  { sign: "≦", bound: "upper" },
  { sign: "<", bound: "upper" },
  { sign: "=", bound: "exact" },
]

/** A decimal number, in either notation. */
const NUMBER = /-?\d+(?:[.,]\d+)?/g

/** The unit that follows a number: "%", "EU/mg", "mg" … */
const UNIT = /^([A-Za-zµ%/][A-Za-zµ%/0-9]*)/

function parseNumber(text: string): number | null {
  const match = text.match(NUMBER)
  if (!match) return null
  const value = Number.parseFloat(match[0].replace(",", "."))
  return Number.isFinite(value) ? value : null
}

/**
 * The unit a number is reported in.
 *
 * Only the token directly after the number is taken: "% area" is reported as
 * "%", because "area" is the name of what the percentage measures and not a
 * unit a bar can be scaled by.
 */
function parseUnit(text: string): string | null {
  const match = text.match(NUMBER)
  if (!match) return null
  const after = text.slice((match.index ?? 0) + match[0].length).trim()
  const unit = after.match(UNIT)
  if (!unit) return null
  return unit[1] ?? null
}

/**
 * The range a bar for this reading is drawn over.
 *
 * A floor is drawn from a little below the limit so that the margin between
 * the measurement and the limit is visible — a purity of 99.4 % against a
 * limit of 98 % is a bar that is nearly full, not one that is 99 % full. A
 * percentage is drawn to 100, because that is the end of the scale whatever
 * the limit says. A ceiling is drawn from zero to a little above the limit,
 * so a measurement near the ceiling looks near the ceiling.
 */
export function assayScale(reading: {
  bound: AssayBound
  value: number | null
  limit: number | null
  unit?: string | null
}): AssayScale | null {
  const { bound, value, limit } = reading
  if (value === null || limit === null) return null
  if (bound === "lower") {
    const min = Math.max(0, Math.min(95, limit - 2))
    const max = reading.unit === "%" ? 100 : Math.min(100, limit + 1)
    return max > min ? { min, max } : null
  }
  if (bound === "upper") {
    const max = Math.round(limit * 1.25 * 10) / 10
    return max > 0 ? { min: 0, max } : null
  }
  if (bound === "exact") {
    const max = Math.round(value * 1.2 * 100) / 100
    return max > 0 ? { min: 0, max } : null
  }
  return null
}

/** One recorded assay row, read as numbers. */
export function readAssay(test: CertificateTest): AssayReading {
  const spec = test.spec ?? null
  const sign = spec ? BOUND_SIGNS.find((entry) => spec.includes(entry.sign)) : undefined
  const bound: AssayBound = sign?.bound ?? (parseNumber(test.result) === null ? "none" : "exact")
  const limit = spec && sign ? parseNumber(spec) : null
  const value = parseNumber(test.result)
  const unit = parseUnit(test.result) ?? (spec ? parseUnit(spec) : null)
  const reading: AssayReading = {
    id: test.id,
    name: test.name,
    method: test.method,
    result: test.result,
    spec,
    pass: test.pass,
    performedAt: test.performedAt,
    bound,
    value,
    limit,
    unit,
    scale: null,
  }
  reading.scale = assayScale(reading)
  return reading
}

/**
 * The readings in the order a reader wants them.
 *
 * The lot's own record is the authority on the order the assays were run in,
 * but a reader opens a certificate to find the purity first. The headline
 * assay is therefore moved to the front and everything else keeps the order
 * the laboratory recorded.
 */
const HEADLINE_ASSAYS = [/purity/i, /assay/i, /identity/i, /mass spect/i]

export function orderAssays(readings: AssayReading[]): AssayReading[] {
  const headline = readings.findIndex((reading) =>
    HEADLINE_ASSAYS.some((pattern) => pattern.test(reading.name)),
  )
  const first = readings[headline]
  if (headline <= 0 || !first) return readings
  return [first, ...readings.slice(0, headline), ...readings.slice(headline + 1)]
}

/** Every assay row of a lot, read as numbers. */
export function readAssays(tests: CertificateTest[]): AssayReading[] {
  return tests.map(readAssay)
}

/** Where a measurement sits on its own scale, as a fraction between 0 and 1. */
export function assayPosition(reading: AssayReading): number | null {
  if (!reading.scale || reading.value === null) return null
  const span = reading.scale.max - reading.scale.min
  if (span <= 0) return null
  const raw = (reading.value - reading.scale.min) / span
  return Math.max(0, Math.min(1, raw))
}

/** Where the specification sits on its own scale. */
export function assayLimitPosition(reading: AssayReading): number | null {
  if (!reading.scale || reading.limit === null) return null
  const span = reading.scale.max - reading.scale.min
  if (span <= 0) return null
  const raw = (reading.limit - reading.scale.min) / span
  return Math.max(0, Math.min(1, raw))
}
