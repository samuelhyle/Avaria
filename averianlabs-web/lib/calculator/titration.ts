/**
 * `lib/calculator/titration.ts` — dose ladders and weekly schedules.
 *
 * Two distinct features share the same module:
 *
 *   - `titrationLadder` builds a linear ramp from `startMcg` to `endMcg` over
 *     `steps` increments. Common in Tirzepatide / Retatrutide research
 *     protocols where the dose climbs over weeks.
 *
 *   - `weeklySchedule` lays a fixed dose across `weekCount` weeks,
 *     `dosesPerWeek`, returning total mL drawn, vials consumed, and a
 *     pre-formatted day-by-day table.
 */

import { DEFAULT_SYRINGE, type SyringeSpec, mlToIu } from "@/lib/calculator/syringe"
import { roundIu, roundLiquid, roundMcg } from "@/lib/calculator/round"
import { solveReconstitution } from "@/lib/calculator/reconstitution"

export interface TitrationStep {
  /** 0-indexed step number, 0 = first dose. */
  index: number
  /** Week label, e.g. "Week 1", "Week 5". */
  label: string
  /** Target dose in micrograms at this step. */
  doseMcg: number
  /** Volume to draw in mL at this step. */
  volumePerDoseMl: number
  /** IU drawn at this step. */
  iuPerDose: number
}

export interface TitrationLadderInputs {
  vialMg: number
  solventMl: number
  startMcg: number
  endMcg: number
  steps: number
  /** Optional override of the syringe used to render the IU display. */
  syringe?: SyringeSpec
}

export interface TitrationLadder {
  steps: TitrationStep[]
  /** Sum of all mL drawn across the ladder. */
  totalVolumeMl: number
  /** mg of peptide actually consumed by the ladder (≤ vialMg). */
  totalConsumedMg: number
  /** True when the ladder exceeds one vial. */
  requiresMultipleVials: boolean
}

export function titrationLadder(input: TitrationLadderInputs): TitrationLadder {
  const syringe = input.syringe ?? DEFAULT_SYRINGE
  if (
    !Number.isFinite(input.vialMg) ||
    !Number.isFinite(input.solventMl) ||
    !Number.isFinite(input.startMcg) ||
    !Number.isFinite(input.endMcg) ||
    input.vialMg <= 0 ||
    input.solventMl <= 0 ||
    input.startMcg <= 0 ||
    input.endMcg <= 0 ||
    input.steps <= 0
  ) {
    return { steps: [], totalVolumeMl: 0, totalConsumedMg: 0, requiresMultipleVials: false }
  }
  const stepCount = Math.max(2, Math.floor(input.steps))
  const results: TitrationStep[] = []
  let totalMcgDrawn = 0
  for (let i = 0; i < stepCount; i++) {
    const t = stepCount === 1 ? 1 : i / (stepCount - 1)
    const doseMcg = input.startMcg + (input.endMcg - input.startMcg) * t
    const recon = solveReconstitution({
      vialMg: input.vialMg,
      solventMl: input.solventMl,
      doseMcg: roundMcg(doseMcg),
      syringe,
    })
    totalMcgDrawn += recon.volumePerDoseMl * recon.concentrationMcgPerMl
    results.push({
      index: i,
      label: i === 0 ? "Week 1" : `Week ${i + 1}`,
      doseMcg: roundMcg(doseMcg),
      volumePerDoseMl: recon.volumePerDoseMl,
      iuPerDose: roundIu(recon.iuPerDose, 1),
    })
  }
  const totalMcg = Math.max(totalMcgDrawn, 0)
  return {
    steps: results,
    totalVolumeMl: roundLiquid(results.reduce((s, r) => s + r.volumePerDoseMl, 0), 3),
    totalConsumedMg: roundLiquid(totalMcg / 1000, 3),
    requiresMultipleVials: totalMcg > input.vialMg * 1000 * 0.98,
  }
}

export interface WeeklyScheduleInputs {
  vialMg: number
  solventMl: number
  doseMcg: number
  weekCount: number
  dosesPerWeek: number
  startDate?: Date
  syringe?: SyringeSpec
  /** Locale-aware day labels (defaults to English short weekday names). */
  weekday?: (date: Date, locale: string) => string
  locale?: string
}

export interface WeeklyDoseEntry {
  weekIndex: number
  weekLabel: string
  date: Date
  doseMcg: number
  volumePerDoseMl: number
  iuPerDose: number
}

export interface WeeklySchedule {
  entries: WeeklyDoseEntry[]
  totalDoses: number
  totalVolumeMl: number
  totalConsumedMg: number
  estimatedVials: number
}

const DEFAULT_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
function defaultWeekday(date: Date, locale: string): string {
  const idx = date.getDay()
  if (locale && locale !== "en") {
    try {
      const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" })
      return fmt.format(date)
    } catch {
      // ignore
    }
  }
  return DEFAULT_WEEKDAY_LABELS[idx] ?? ""
}

export function weeklySchedule(input: WeeklyScheduleInputs): WeeklySchedule {
  const syringe = input.syringe ?? DEFAULT_SYRINGE
  if (
    !Number.isFinite(input.vialMg) ||
    !Number.isFinite(input.solventMl) ||
    !Number.isFinite(input.doseMcg) ||
    input.weekCount <= 0 ||
    input.dosesPerWeek <= 0
  ) {
    return { entries: [], totalDoses: 0, totalVolumeMl: 0, totalConsumedMg: 0, estimatedVials: 0 }
  }

  const recon = solveReconstitution({
    vialMg: input.vialMg,
    solventMl: input.solventMl,
    doseMcg: input.doseMcg,
    syringe,
  })
  if (recon.invalid) {
    return { entries: [], totalDoses: 0, totalVolumeMl: 0, totalConsumedMg: 0, estimatedVials: 0 }
  }

  const start = input.startDate ?? new Date()
  const entries: WeeklyDoseEntry[] = []
  const weekday = input.weekday ?? defaultWeekday
  const locale = input.locale ?? "en"
  for (let week = 0; week < input.weekCount; week++) {
    for (let d = 0; d < input.dosesPerWeek; d++) {
      const offsetDays = week * 7 + Math.floor((d * 7) / input.dosesPerWeek)
      const date = new Date(start.getTime() + offsetDays * 24 * 60 * 60 * 1000)
      entries.push({
        weekIndex: week,
        weekLabel: week === 0 ? "Week 1" : `Week ${week + 1}`,
        date,
        doseMcg: input.doseMcg,
        volumePerDoseMl: recon.volumePerDoseMl,
        iuPerDose: roundIu(mlToIu(recon.volumePerDoseMl, syringe.iuPerMl), 1),
      })
    }
  }

  const totalMcgDrawn = entries.length * input.doseMcg
  const totalVials = Math.ceil(totalMcgDrawn / (input.vialMg * 1000))
  return {
    entries,
    totalDoses: entries.length,
    totalVolumeMl: roundLiquid(entries.length * recon.volumePerDoseMl, 3),
    totalConsumedMg: roundLiquid(totalMcgDrawn / 1000, 3),
    estimatedVials: totalVials,
  }
}

/**
 * Format a date for the schedule table. Kept in the lib so server-rendered
 * HMR-stable and client clock-skew-resistant.
 *
 * If the locale is unsupported by the runtime (e.g. a typo like `xx-YY`),
 * fall back to a stable ISO date so the schedule table stays readable.
 */
export function formatScheduleDate(date: Date, locale: string = "en"): string {
  let formatted: string
  try {
    formatted = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
  // V8 ICU is lenient and accepts most locale strings, so we also catch
  // visible-naïve output ("NaN", "Invalid Date") and unknown ICU tags.
  if (
    formatted.includes("NaN") ||
    formatted.includes("Invalid") ||
    /^\d{4}-\d{2}-\d{2}$/.test(formatted) === false && formatted.length < 4
  ) {
    return date.toISOString().slice(0, 10)
  }
  return formatted
}
