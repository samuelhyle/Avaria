import { describe, expect, it } from "vitest"
import {
  MAX_PEPTIDE_RATIO_MG_PER_ML,
  RECONSTITUTION_PRESETS,
  formatIu,
  formatMcg,
  formatMg,
  formatMl,
  solveReconstitution,
  vialYield,
} from "@/lib/calculator/reconstitution"

describe("solveReconstitution — happy paths", () => {
  it("matches the persona test REC-01 (BPC-157 5 mg / 2 mL / 250 mcg)", () => {
    const r = solveReconstitution({ vialMg: 5, solventMl: 2, doseMcg: 250 })
    expect(r.concentrationMgPerMl).toBe(2.5)
    expect(r.concentrationMcgPerMl).toBe(2500)
    expect(r.volumePerDoseMl).toBeCloseTo(0.1, 4)
    expect(r.iuPerDose).toBe(10)
    expect(r.iuPerDoseSnapped).toBe(10)
    expect(r.totalDoses).toBe(20)
  })
  it("matches REC-02 (10 mg / 3 mL / 500 mcg on 50 IU syringe)", () => {
    const r = solveReconstitution({
      vialMg: 10,
      solventMl: 3,
      doseMcg: 500,
      syringe: { label: "0.5 mL · 50 IU", barrelMl: 0.5, ticks: 50, iuPerMl: 100, majorTicks: 5 },
    })
    expect(r.concentrationMgPerMl).toBeCloseTo(3.333, 3)
    expect(r.volumePerDoseMl).toBeCloseTo(0.15, 4)
    expect(r.iuPerDose).toBeCloseTo(15, 1)
    expect(r.totalDoses).toBe(20)
  })
  it("matches REC-04 (10 mg / 2 mL / 250 mcg → 40 doses)", () => {
    const r = solveReconstitution({ vialMg: 10, solventMl: 2, doseMcg: 250 })
    expect(r.totalDoses).toBe(40)
    expect(r.volumePerDoseMl).toBe(0.05)
    expect(r.iuPerDose).toBe(5)
  })
  it("matches REC-08 guardrail (vialMg=0 → invalid)", () => {
    const r = solveReconstitution({ vialMg: 0, solventMl: 2, doseMcg: 250 })
    expect(r.invalid?.reason).toBe("non-positive")
    expect(r.invalid?.fields).toContain("vialMg")
  })
})

describe("solveReconstitution — validation", () => {
  it("flags concentration above the safety ratio", () => {
    const r = solveReconstitution({ vialMg: 100, solventMl: 1, doseMcg: 1000 })
    expect(r.invalid?.reason).toBe("concentration_too_high")
  })
  it("exports a sane MAX ratio", () => {
    expect(MAX_PEPTIDE_RATIO_MG_PER_ML).toBe(50)
  })
  it("flags non-positive values", () => {
    const r = solveReconstitution({ vialMg: 10, solventMl: 0, doseMcg: 250 })
    expect(r.invalid?.reason).toBe("non-positive")
    expect(r.invalid?.fields).toContain("solventMl")
  })
  it("flags NaN inputs", () => {
    const r = solveReconstitution({ vialMg: NaN, solventMl: 2, doseMcg: 250 })
    expect(r.invalid?.reason).toBe("nan")
  })
})

describe("vialYield", () => {
  it("computes total doses ignoring solvent", () => {
    expect(vialYield(10, 250)).toBe(40)
    expect(vialYield(5, 250)).toBe(20)
    expect(vialYield(10, 500)).toBe(20)
  })
  it("returns zero for invalid inputs", () => {
    expect(vialYield(0, 250)).toBe(0)
    expect(vialYield(10, 0)).toBe(0)
    expect(vialYield(NaN, 250)).toBe(0)
  })
})

describe("RECONSTITUTION_PRESETS", () => {
  it("includes the catalog anchors", () => {
    const ids = RECONSTITUTION_PRESETS.map((p) => p.id)
    expect(ids).toContain("bpc5-2ml-250")
    expect(ids).toContain("ghk50-3ml-2mg")
    expect(ids).toContain("nad1000-10ml-50mg")
  })
})

describe("formatters", () => {
  it("formats mcg/mg/ml/iu with locale", () => {
    expect(formatMcg(250)).toContain("250")
    expect(formatMcg(250)).toContain("mcg")
    expect(formatMg(5)).toContain("5")
    expect(formatMl(0.075)).toContain("0.075")
    expect(formatMl(0.075)).toContain("mL")
    expect(formatIu(7.5)).toBe("7.5 IU")
    expect(formatIu(10)).toBe("10 IU")
  })
  it("uses en-GB thousands separators when requested", () => {
    const formatted = formatMg(1234, "en-GB")
    expect(formatted).toMatch(/1[,]234/)
  })
})
