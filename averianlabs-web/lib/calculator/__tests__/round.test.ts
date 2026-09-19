import { describe, expect, it } from "vitest"
import { roundIu, roundLiquid, roundMcg, roundMg, significant } from "@/lib/calculator/round"

describe("roundLiquid (bankers rounding)", () => {
  it("rounds half-to-even at the boundary", () => {
    expect(roundLiquid(0.125, 2)).toBe(0.12)
    expect(roundLiquid(0.135, 2)).toBe(0.14)
    expect(roundLiquid(0.025, 2)).toBe(0.02)
    expect(roundLiquid(0.035, 2)).toBe(0.04)
  })
  it("passes through infinities and NaN", () => {
    expect(roundLiquid(Infinity)).toBe(Infinity)
    expect(roundLiquid(-Infinity)).toBe(-Infinity)
    expect(Number.isNaN(roundLiquid(NaN))).toBe(true)
  })
  it("throws for negative decimals", () => {
    expect(() => roundLiquid(1, -1)).toThrow()
  })
  it("handles sub-microlitre precision", () => {
    expect(roundLiquid(0.00049, 5)).toBe(0.00049)
  })
})

describe("roundMcg / roundMg / roundIu", () => {
  it("rounds to integer micrograms", () => {
    expect(roundMcg(250.4)).toBe(250)
    expect(roundMcg(250.6)).toBe(251)
  })
  it("rounds to integer milligrams", () => {
    expect(roundMg(10.4)).toBe(10)
    expect(roundMg(10.6)).toBe(11)
  })
  it("honours tickSize", () => {
    expect(roundIu(7.24, 1)).toBe(7)
    expect(roundIu(7.26, 1)).toBe(7)
    expect(roundIu(7.5, 1)).toBe(8)
    expect(roundIu(7.5, 0.5)).toBe(7.5)
    expect(roundIu(3.6, 0.2)).toBe(3.6)
  })
  it("throws on non-positive tickSize", () => {
    expect(() => roundIu(1, 0)).toThrow()
    expect(() => roundIu(1, -0.5)).toThrow()
  })
})

describe("significant", () => {
  it("trims to N significant digits", () => {
    expect(significant(0.0755, 3)).toBe(0.0755)
    expect(significant(0.0755, 2)).toBe(0.076)
    expect(significant(12500, 3)).toBe(12500)
    expect(significant(12500, 2)).toBe(13000)
  })
  it("returns zero unchanged", () => {
    expect(significant(0)).toBe(0)
  })
  it("survives negative numbers", () => {
    expect(significant(-0.0755, 3)).toBe(-0.0755)
    expect(significant(-12500, 2)).toBe(-13000)
  })
})
