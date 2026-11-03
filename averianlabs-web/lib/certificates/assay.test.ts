import { describe, expect, it } from "vitest"
import {
  assayLimitPosition,
  assayPosition,
  assayScale,
  orderAssays,
  readAssay,
  readAssays,
} from "./assay"
import type { CertificateTest } from "./types"

function test(overrides: Partial<CertificateTest> = {}): CertificateTest {
  return {
    id: "t1",
    name: "HPLC purity",
    method: "RP-HPLC (C18, 280 nm)",
    result: "99.400 % area",
    spec: "≥ 98.0 % area",
    pass: true,
    performedAt: "2026-07-12T00:00:00.000Z",
    ...overrides,
  }
}

describe("readAssay", () => {
  it("reads a floor specification", () => {
    const reading = readAssay(test())
    expect(reading.bound).toBe("lower")
    expect(reading.value).toBe(99.4)
    expect(reading.limit).toBe(98)
    expect(reading.unit).toBe("%")
  })

  it("reads a ceiling specification", () => {
    const reading = readAssay(test({ name: "Endotoxin", result: "2.1 EU/mg", spec: "≤ 2.4 EU/mg" }))
    expect(reading.bound).toBe("upper")
    expect(reading.value).toBe(2.1)
    expect(reading.limit).toBe(2.4)
    expect(reading.unit).toBe("EU/mg")
  })

  it("reads an identity confirmation as a statement rather than a number", () => {
    const reading = readAssay(
      test({
        name: "Mass spectrometry",
        method: "ESI-MS",
        result: "Identity confirmed",
        spec: "Identity confirmed",
      }),
    )
    expect(reading.bound).toBe("none")
    expect(reading.value).toBeNull()
    expect(reading.limit).toBeNull()
    expect(reading.scale).toBeNull()
  })

  it("accepts a comma as the decimal separator", () => {
    const reading = readAssay(test({ result: "99,400 % area" }))
    expect(reading.value).toBe(99.4)
  })

  it("keeps the reported text exactly as it was written", () => {
    const reading = readAssay(test())
    expect(reading.result).toBe("99.400 % area")
    expect(reading.spec).toBe("≥ 98.0 % area")
  })
})

describe("assayScale", () => {
  it("draws a floor from below the limit so the margin is visible", () => {
    const reading = readAssay(test())
    expect(reading.scale).toEqual({ min: 95, max: 100 })
  })

  it("draws a percentage to a hundred", () => {
    const reading = readAssay(test())
    expect(reading.scale?.max).toBe(100)
  })

  it("draws a ceiling from zero to a little above the limit", () => {
    const reading = readAssay(test({ result: "2.1 EU/mg", spec: "≤ 2.4 EU/mg" }))
    expect(reading.scale).toEqual({ min: 0, max: 3 })
  })

  it("has no scale when there is nothing to compare", () => {
    expect(assayScale({ bound: "none", value: null, limit: null })).toBeNull()
  })
})

describe("assayPosition", () => {
  it("places a measurement on its own scale", () => {
    const reading = readAssay(test())
    // 99.4 on a 95–100 scale.
    expect(assayPosition(reading)).toBeCloseTo(0.88, 5)
  })

  it("places the specification on the same scale", () => {
    const reading = readAssay(test())
    expect(assayLimitPosition(reading)).toBeCloseTo(0.6, 5)
  })

  it("has no position for a reading without a scale", () => {
    const reading = readAssay(test({ result: "Identity confirmed", spec: "Identity confirmed" }))
    expect(assayPosition(reading)).toBeNull()
    expect(assayLimitPosition(reading)).toBeNull()
  })
})

describe("readAssays", () => {
  it("reads every row of a lot", () => {
    const readings = readAssays([
      test(),
      test({ id: "t2", name: "Endotoxin", result: "2.1 EU/mg", spec: "≤ 2.4 EU/mg" }),
    ])
    expect(readings).toHaveLength(2)
    expect(readings.map((reading) => reading.name)).toEqual(["HPLC purity", "Endotoxin"])
  })
})

describe("orderAssays", () => {
  it("puts the headline assay first and keeps the rest in order", () => {
    const readings = readAssays([
      test({ id: "t1", name: "Endotoxin", result: "0.2 EU/mg", spec: "≤ 2.4 EU/mg" }),
      test({ id: "t2", name: "HPLC purity" }),
      test({
        id: "t3",
        name: "Mass spectrometry",
        result: "Identity confirmed",
        spec: "Identity confirmed",
      }),
    ])
    expect(orderAssays(readings).map((reading) => reading.name)).toEqual([
      "HPLC purity",
      "Endotoxin",
      "Mass spectrometry",
    ])
  })

  it("leaves the order alone when the headline assay is already first", () => {
    const readings = readAssays([
      test({ id: "t1", name: "HPLC purity" }),
      test({ id: "t2", name: "Endotoxin", result: "0.2 EU/mg", spec: "≤ 2.4 EU/mg" }),
    ])
    expect(orderAssays(readings).map((reading) => reading.name)).toEqual([
      "HPLC purity",
      "Endotoxin",
    ])
  })
})
