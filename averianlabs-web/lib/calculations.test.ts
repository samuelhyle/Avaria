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

import { laboratoryCalculationTool } from "./ai/tools/laboratory-calculation"
import {
  calculateConcentration,
  calculateDilution,
  calculateLaboratory,
  calculateTargetVolume,
  parseLaboratoryNumber,
} from "./calculations"
describe("research calculator modes and language input", () => {
  it("accepts Finnish decimal commas and scientific notation without ambiguous separators", () => {
    expect(parseLaboratoryNumber("0,5", "fi")).toBe(0.5)
    expect(parseLaboratoryNumber("1e-3", "en")).toBe(0.001)
    expect(parseLaboratoryNumber("1,000", "en")).toBeNull()
    for (const text of ["", "1,2.3", "Infinity", "NaN", "-1", "0", "1e100", "1 000"])
      expect(parseLaboratoryNumber(text, "fi")).toBeNull()
  })
  it("rejects derived overflow/underflow and excessive aliquot counts", () => {
    expect(calculateAliquots(1e100, 1e-208, 1e103)).toBeNull()
    expect(calculateConcentration(1e12, 1e-12)).toBeNull()
    expect(calculateTargetVolume(1e-12, 1e12)).toBeNull()
  })
  it("calculates final volume and ideal dilution without equating added solvent with final volume", () => {
    expect(calculateTargetVolume(10, 5)).toEqual({ finalVolumeMl: 2, finalVolumeUl: 2000 })
    expect(calculateDilution(5, 1, 2)).toEqual({
      stockVolumeMl: 0.4,
      stockVolumeUl: 400,
      finalVolumeMl: 2,
      makeUpVolumeMl: 1.6,
    })
    expect(calculateDilution(1, 5, 2)).toBeNull()
    expect(calculateDilution(5, 5, 2)?.makeUpVolumeMl).toBe(0)
  })
  it("retains the unused material after complete aliquots", () => {
    const result = calculateLaboratory({
      mode: "aliquots",
      massMg: 1,
      finalVolumeMl: 1,
      aliquotMcg: 300,
    })
    expect(result?.values.aliquotCount).toBe(3)
    expect(result?.values.remainingMassMcg).toBeCloseTo(100)
    expect(result?.values.remainingVolumeMl).toBeCloseTo(0.1)
  })
  it.each(["concentration", "volume", "dilution", "aliquots"] as const)(
    "shares exact normalized %s results with the assistant",
    async (mode) => {
      const inputs = {
        mode,
        massMg: 10,
        finalVolumeMl: 2,
        aliquotMcg: 250,
        stockMgPerMl: 5,
        targetMgPerMl: 1,
      }
      const result = await laboratoryCalculationTool.execute(inputs, { locale: "fi", cart: [] })
      expect((result.content as { calculation: unknown }).calculation).toEqual(
        calculateLaboratory(inputs),
      )
    },
  )
})

import { calculationProseWarnings } from "./ai/guardrails/calculation"
it("rejects conflicting units or numerical prose while retaining the deterministic calculation card", () => {
  const inputs = { mode: "aliquots" as const, massMg: 10, finalVolumeMl: 2, aliquotMcg: 250 }
  expect(calculationProseWarnings("5 mg/mL, 0.05 mL = 50 µL", inputs, "en")).toEqual([])
  expect(calculationProseWarnings("5 mg/mL, 0,05 mL = 50 µL", inputs, "fi")).toEqual([])
  expect(
    calculationProseWarnings("The aliquot is 0.5 mL or 500 µL", inputs, "en").length,
  ).toBeGreaterThan(0)
})

it("checks a reply against all requested calculations without rejecting the other valid result", () => {
  const inputs = [
    { mode: "concentration" as const, massMg: 10, finalVolumeMl: 2 },
    { mode: "concentration" as const, massMg: 10, finalVolumeMl: 4 },
  ]
  expect(
    calculationProseWarnings(
      "10 mg in 2 mL gives 5 mg/mL; in 4 mL it gives 2.5 mg/mL.",
      inputs,
      "en",
    ),
  ).toEqual([])
  expect(calculationProseWarnings("The result is 500 mg/mL.", inputs, "en")).not.toEqual([])
})
