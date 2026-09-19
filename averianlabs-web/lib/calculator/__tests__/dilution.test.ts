import { describe, expect, it } from "vitest"
import { designDilution } from "@/lib/calculator/dilution"

describe("designDilution", () => {
  it("returns no dilution when draw already meets the minimum", () => {
    const plan = designDilution({ vialMg: 10, solventMl: 2, doseMcg: 500 })
    // 10 mg / 2 mL × 500 mcg = 0.1 mL ≥ 0.05 mL minimum
    expect(plan.warning).toBe("no_dilution_needed")
    expect(plan.totalDilutionFactor).toBe(1)
  })
  it("designs a 1:10 dilution for small draws", () => {
    const plan = designDilution({
      vialMg: 100,
      solventMl: 2,
      doseMcg: 50,
      minPracticalDrawMl: 0.05,
      maxDilutionFactor: 100,
    })
    // 50 mg/mL × 50 mcg = 0.001 mL → requires dilution
    expect(plan.warning).toBe("dilution_required")
    expect(plan.totalDilutionFactor).toBeGreaterThan(1)
    expect(plan.steps).toHaveLength(2)
    expect(plan.steps[1]?.label).toMatch(/1:(\d+)/)
  })
  it("escalates to excessive_dilution when the required factor exceeds the cap", () => {
    const plan = designDilution({
      vialMg: 100,
      solventMl: 2,
      doseMcg: 50,
      minPracticalDrawMl: 0.05,
      maxDilutionFactor: 20,
    })
    expect(plan.warning).toBe("excessive_dilution")
    expect(plan.totalDilutionFactor).toBeLessThanOrEqual(20)
  })
  it("returns impossible for invalid inputs", () => {
    const plan = designDilution({ vialMg: 0, solventMl: 2, doseMcg: 250 })
    expect(plan.warning).toBe("impossible")
    expect(plan.steps).toHaveLength(0)
  })
  it("accepts a moderate draw without forcing dilution", () => {
    const plan = designDilution({ vialMg: 10, solventMl: 3, doseMcg: 500 })
    expect(plan.warning).toBe("no_dilution_needed")
  })
  it("returns impossible for invalid inputs", () => {
    const plan = designDilution({ vialMg: 0, solventMl: 2, doseMcg: 250 })
    expect(plan.warning).toBe("impossible")
    expect(plan.steps).toHaveLength(0)
  })
})
