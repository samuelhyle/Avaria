import { describe, expect, it } from "vitest"
import { laboratoryCalculationTool } from "../tools/laboratory-calculation"
import { missingUserQuantities } from "./quantities"
const input = { mode: "concentration" as const, massMg: 10, finalVolumeMl: 2 }
describe("user quantity provenance", () => {
  it("rejects invented defaults on a conceptual question and ignores assistant-only examples", () => {
    expect(
      missingUserQuantities(
        input,
        [
          { role: "assistant", content: "An example is 10 mg in 2 mL." },
          { role: "user", content: "Does HPLC area purity establish vial content?" },
        ],
        "en",
      ),
    ).toEqual(["massMg", "finalVolumeMl"])
  })
  it("identifies the missing quantity instead of accepting a model-provided final volume", () => {
    expect(
      missingUserQuantities(input, [{ role: "user", content: "I have 10 mg." }], "en"),
    ).toEqual(["finalVolumeMl"])
    expect(
      missingUserQuantities(input, [{ role: "user", content: "Calculate -10 mg in 2 mL." }], "en"),
    ).toEqual(["massMg"])
  })
  it("normalizes explicit micro-units, scientific notation and Finnish decimals", () => {
    expect(
      missingUserQuantities(
        { mode: "concentration", massMg: 1, finalVolumeMl: 0.5 },
        [{ role: "user", content: "1e3 micrograms in 500 microlitres." }],
        "en",
      ),
    ).toEqual([])
    expect(
      missingUserQuantities(
        { mode: "concentration", massMg: 0.5, finalVolumeMl: 0.25 },
        [{ role: "user", content: "Massa 0,5 mg ja lopullinen tilavuus 0,25 mL." }],
        "fi",
      ),
    ).toEqual([])
  })
  it("accepts explicit normalized calculator handoff fields and preserves real multi-turn input", () => {
    expect(
      missingUserQuantities(
        input,
        [
          {
            role: "user",
            content: 'Explain {"mode":"concentration","massMg":10,"finalVolumeMl":2}',
          },
        ],
        "en",
      ),
    ).toEqual([])
    expect(
      missingUserQuantities(
        input,
        [
          { role: "user", content: "The mass is 10 mg." },
          { role: "assistant", content: "What final volume?" },
          { role: "user", content: "2 mL final volume." },
        ],
        "en",
      ),
    ).toEqual([])
  })
  it("does not return a successful tool calculation for an unrequested numerical example", async () => {
    const result = await laboratoryCalculationTool.execute(input, {
      locale: "en",
      cart: [],
      transcript: [
        {
          role: "user",
          content: "Does HPLC area purity establish vial content?",
          at: "2026-10-15T00:00:00Z",
        },
      ],
    })
    expect(result.content).toMatchObject({ error: "unprovided_quantities" })
    expect(result.content).not.toHaveProperty("calculation")
  })
  it("omits irrelevant model fields from the confirmed calculation inputs", async () => {
    const result = await laboratoryCalculationTool.execute(
      { ...input, targetMgPerMl: 99 },
      {
        locale: "en",
        cart: [],
        transcript: [
          { role: "user", content: "10 mg in a final 2 mL solution.", at: "2026-10-15T00:00:00Z" },
        ],
      },
    )
    expect(result.content).toMatchObject({ calculation: { inputs: input } })
    expect(
      (result.content as { calculation: { inputs: unknown } }).calculation.inputs,
    ).not.toHaveProperty("targetMgPerMl")
  })
})
