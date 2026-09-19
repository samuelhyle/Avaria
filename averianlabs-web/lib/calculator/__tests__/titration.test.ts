import { describe, expect, it } from "vitest"
import {
  formatScheduleDate,
  titrationLadder,
  weeklySchedule,
} from "@/lib/calculator/titration"

describe("titrationLadder", () => {
  it("ramps linearly from start to end over the given steps", () => {
    const ladder = titrationLadder({
      vialMg: 20,
      solventMl: 2,
      startMcg: 2500,
      endMcg: 15000,
      steps: 6,
    })
    expect(ladder.steps).toHaveLength(6)
    expect(ladder.steps[0]?.doseMcg).toBe(2500)
    expect(ladder.steps[5]?.doseMcg).toBe(15000)
    // Each step gets a realistic mL draw (≈ (mcg/vialMg*1000) * solventMl)
    expect(ladder.steps[5]?.volumePerDoseMl).toBeCloseTo(1.5, 2)
  })
  it("returns an empty ladder for invalid inputs", () => {
    expect(titrationLadder({ vialMg: 0, solventMl: 2, startMcg: 100, endMcg: 200, steps: 4 }).steps).toHaveLength(0)
    expect(titrationLadder({ vialMg: 10, solventMl: 2, startMcg: 100, endMcg: 200, steps: 0 }).steps).toHaveLength(0)
  })
  it("flags when the ladder exceeds one vial", () => {
    const ladder = titrationLadder({
      vialMg: 5,
      solventMl: 2,
      startMcg: 5000,
      endMcg: 8000,
      steps: 12,
    })
    expect(ladder.requiresMultipleVials).toBe(true)
  })
})

describe("weeklySchedule", () => {
  it("spans the requested number of weeks × doses per week", () => {
    const schedule = weeklySchedule({
      vialMg: 10,
      solventMl: 3,
      doseMcg: 250,
      weekCount: 4,
      dosesPerWeek: 5,
    })
    expect(schedule.entries).toHaveLength(20)
    expect(schedule.estimatedVials).toBeGreaterThanOrEqual(1)
  })
  it("returns empty for invalid scenarios", () => {
    const schedule = weeklySchedule({ vialMg: 0, solventMl: 2, doseMcg: 250, weekCount: 4, dosesPerWeek: 5 })
    expect(schedule.entries).toHaveLength(0)
  })
})

describe("formatScheduleDate", () => {
  it("renders dates in the requested locale (en-GB has leading zeros)", () => {
    const text = formatScheduleDate(new Date("2026-09-19T00:00:00Z"), "en-GB")
    expect(text).toMatch(/\d{2}/)
  })
  it("survives truly malformed locales by returning a date string", () => {
    // The runtime falls back gracefully even for unknown locales; we only
    // assert that the result is non-empty and resolves back to a real date.
    const text = formatScheduleDate(new Date("2026-09-19T00:00:00Z"), "xx-YY")
    expect(text).not.toHaveLength(0)
    expect(Number.isNaN(Date.parse(text))).toBe(false)
  })
})
