import { describe, expect, it } from "vitest"
import {
  hasExplicitNumericalCalculationIntent,
  isReadOnlyCapabilityRequest,
  requiredGuidanceTopic,
} from "./request-intent"

describe("narrow controlled-answer intent", () => {
  it.each([
    "Is the nominal 5 mg measured content?",
    "Compare the composition of these two products.",
    "Show the available molar mass report.",
    "Can you show the molar mass from the product record? No calculation needed.",
    "Show molar concentration from the product record. No calculation needed.",
    "Calculate concentration for 10 mg in 2 mL.",
    "Miksi laskuri tarvitsee lopullisen tilavuuden?",
  ])("does not route unrelated or numerical tasks to molar guidance: %s", (message) => {
    expect(requiredGuidanceTopic(message)).toBeNull()
  })
  it("requires both explicit calculation intent and an actual quantity/unit for failure copy", () => {
    expect(hasExplicitNumericalCalculationIntent("Laske pitoisuus: 10 mg ja 0 mL.")).toBe(true)
    expect(
      hasExplicitNumericalCalculationIntent("Calculate 500 µg in a final 1 mL solution."),
    ).toBe(true)
    expect(hasExplicitNumericalCalculationIntent("Explain the concentration formula.")).toBe(false)
    expect(hasExplicitNumericalCalculationIntent("Is this 10 mg a measured quantity?")).toBe(false)
    expect(hasExplicitNumericalCalculationIntent("Calculate the price for 10 mg.")).toBe(false)
    expect(hasExplicitNumericalCalculationIntent("Laske hinta 10 mg liuokselle.")).toBe(false)
  })
  it.each([
    "Does asking a question save a preference?",
    "Does a private community draft publish automatically?",
    "Miten yksityinen yhteisöluonnos julkaistaan?",
    "Can a batch report establish purity?",
    "Can you support that purity claim with the original source?",
    "Can I save a private account preference?",
    "How do I change my private account preferences?",
  ])(
    "does not replace unrelated privacy or research guidance with order capability copy: %s",
    (message) => {
      expect(isReadOnlyCapabilityRequest(message)).toBe(false)
    },
  )
})
