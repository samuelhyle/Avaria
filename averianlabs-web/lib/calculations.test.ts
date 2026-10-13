import { describe, expect, it } from "vitest"
import { calculateAliquots } from "./calculations"
import { computeOrderTotals, computeShippingCents } from "./pricing"

describe("laboratory calculations", () => {
  it("converts mass and volume into aliquots without syringe or biological unit assumptions", () => {
    expect(calculateAliquots(10, 2, 250)).toEqual({
      concentrationMgPerMl: 5,
      concentrationMcgPerMl: 5000,
      aliquotVolumeMl: 0.05,
      aliquotVolumeUl: 50,
      aliquotCount: 40,
    })
  })
  it("rejects invalid inputs and an aliquot larger than the available material", () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(calculateAliquots(value, 2, 250)).toBeNull()
      expect(calculateAliquots(10, value, 250)).toBeNull()
      expect(calculateAliquots(10, 2, value)).toBeNull()
    }
    expect(calculateAliquots(1, 2, 2000)).toBeNull()
  })
})
describe("VAT inclusive checkout", () => {
  it("includes VAT in the merchandise and delivery total", () => {
    expect(computeOrderTotals(12550, 1255)).toEqual({ totalCents: 13805, vatCents: 2805 })
  })
  it("applies free shipping at the precise threshold", () => {
    expect(computeShippingCents(14999, 590)).toBe(590)
    expect(computeShippingCents(15000, 590)).toBe(0)
    expect(computeShippingCents(0, 590)).toBe(0)
  })
})
