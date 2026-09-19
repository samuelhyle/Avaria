import { describe, expect, it } from "vitest"
import {
  DEFAULT_SYRINGE,
  SYRINGE_PRESETS,
  iuToMl,
  mlToIu,
  smallestSyringeFor,
  snapToSyringeTicks,
} from "@/lib/calculator/syringe"

describe("SYRINGE_PRESETS", () => {
  it("exposes the three insulin sizes most labs keep on hand", () => {
    expect(SYRINGE_PRESETS.map((s) => s.label)).toEqual([
      "0.3 mL · 30 IU",
      "0.5 mL · 50 IU",
      "1.0 mL · 100 IU",
    ])
  })
  it("default is the 1 mL / 100 IU", () => {
    expect(DEFAULT_SYRINGE.barrelMl).toBe(1)
    expect(DEFAULT_SYRINGE.iuPerMl).toBe(100)
  })
})

describe("iuToMl / mlToIu", () => {
  it("inverts correctly", () => {
    expect(iuToMl(10, 100)).toBe(0.1)
    expect(mlToIu(0.1, 100)).toBe(10)
    expect(iuToMl(7.5, 50)).toBe(0.15)
  })
  it("returns NaN for invalid inputs", () => {
    expect(Number.isNaN(iuToMl(NaN, 100))).toBe(true)
    expect(Number.isNaN(mlToIu(0.5, 0))).toBe(true)
  })
})

describe("snapToSyringeTicks", () => {
  it("rounds to whole IU and reports back the snapped volume", () => {
    const r = snapToSyringeTicks(0.0975, DEFAULT_SYRINGE)
    expect(r.iu).toBe(10)
    expect(r.ticksConsumed).toBe(10)
    expect(r.volumeMl).toBe(0.1)
  })
  it("supports half-IU ticks when asked (5.25 IU rounds to 5.5 with half-up)", () => {
    const r = snapToSyringeTicks(0.0525, DEFAULT_SYRINGE, 0.5)
    expect(r.iu).toBe(5.5)
    expect(r.volumeMl).toBe(0.055)
  })
  it("returns zero for non-finite or negative inputs", () => {
    expect(snapToSyringeTicks(NaN).volumeMl).toBe(0)
    expect(snapToSyringeTicks(-0.1).volumeMl).toBe(0)
  })
})

describe("smallestSyringeFor", () => {
  it("picks 0.3 mL for tiny draws", () => {
    expect(smallestSyringeFor(0.05).label).toBe("0.3 mL · 30 IU")
  })
  it("picks 0.5 mL for medium draws", () => {
    expect(smallestSyringeFor(0.4).label).toBe("0.5 mL · 50 IU")
  })
  it("picks 1.0 mL for big draws", () => {
    expect(smallestSyringeFor(0.8).label).toBe("1.0 mL · 100 IU")
  })
  it("falls back to the largest when the volume exceeds it", () => {
    expect(smallestSyringeFor(2).label).toBe("1.0 mL · 100 IU")
  })
  it("returns default for non-finite inputs", () => {
    expect(smallestSyringeFor(NaN).label).toBe(DEFAULT_SYRINGE.label)
  })
})
