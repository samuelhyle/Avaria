import { describe, expect, it } from "vitest"
import { checkSaturation, getCeilingFor } from "@/lib/calculator/saturation"

describe("getCeilingFor", () => {
  it("returns the catalog ceiling when known", () => {
    expect(getCeilingFor("ghk-cu").ceilingMgPerMl).toBe(3)
    expect(getCeilingFor("nad-plus").ceilingMgPerMl).toBe(100)
    expect(getCeilingFor("bpc-157").ceilingMgPerMl).toBe(5)
  })
  it("falls back to 10 mg/mL when unknown", () => {
    expect(getCeilingFor("totally-fake-peptide").ceilingMgPerMl).toBe(10)
    expect(getCeilingFor(undefined).ceilingMgPerMl).toBe(10)
  })
})

describe("checkSaturation", () => {
  it("returns 'ok' for well-saturated mixes", () => {
    expect(checkSaturation(1, "bpc-157").level).toBe("ok")
  })
  it("escalates to caution at > 75% of the ceiling", () => {
    expect(checkSaturation(4, "bpc-157").level).toBe("caution")
  })
  it("flagged as 'above' past the ceiling", () => {
    expect(checkSaturation(8, "bpc-157").level).toBe("above")
  })
  it("handles invalid concentrations without crashing", () => {
    expect(checkSaturation(0, "bpc-157").level).toBe("ok")
    expect(checkSaturation(NaN, "bpc-157").level).toBe("ok")
  })
})
