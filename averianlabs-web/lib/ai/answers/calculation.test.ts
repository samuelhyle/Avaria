import { describe, expect, it } from "vitest"
import { RESEARCH_EVAL_CASES } from "../eval/research-cases"
import { unsupportedCitationMarkers } from "../guardrails/citations"
import { renderLaboratoryAnswer, renderMissingCalculationInputs } from "./calculation"

describe("controlled laboratory answers", () => {
  it("asks for missing quantities with physical units without exposing tool properties or invented values", () => {
    const answer = renderMissingCalculationInputs(
      [
        {
          name: "calculateLaboratory",
          result: { error: "unprovided_quantities", missing: ["stockMgPerMl", "unknownField"] },
        },
      ],
      "fi",
    )
    expect(answer).toContain("Kantaliuoksen pitoisuus (mg/mL)")
    expect(answer).not.toMatch(/stockMgPerMl|unknownField|10 mg/)
  })
  it.each(RESEARCH_EVAL_CASES.filter((entry) => entry.calculation))(
    "renders $locale/$id from the same validated inputs as the result card",
    (entry) => {
      if (!entry.calculation) throw new Error()
      const answer = renderLaboratoryAnswer([entry.calculation], entry.locale)
      expect(answer).toContain(entry.locale === "fi" ? "Lähtötiedot" : "Inputs")
      expect(answer).toContain(
        entry.locale === "fi" ? "Vain laboratoriotutkimukseen" : "For laboratory research only",
      )
      expect(answer).not.toMatch(/\[\d+\]|calculateLaboratory|massMg|finalVolumeMl/)
      expect(answer).toContain(
        entry.locale === "fi" ? "mittauksen tarkkuutta" : "measurement precision",
      )
    },
  )
  it("distinguishes final dilution volume from its ideal make-up volume", () => {
    const inputs = {
      mode: "dilution" as const,
      stockMgPerMl: 5,
      targetMgPerMl: 1,
      finalVolumeMl: 2,
    }
    const english = renderLaboratoryAnswer([inputs], "en")
    const finnish = renderLaboratoryAnswer([inputs], "fi")
    expect(english).toContain("**0.4 mL**")
    expect(english).toContain("**1.6 mL**")
    expect(english).toContain("additive volumes")
    expect(finnish).toContain("**0,4 mL**")
    expect(finnish).toContain("**1,6 mL**")
    expect(finnish).toContain("tilavuuksien summautuvan")
  })
  it("never renders a numerical answer from invalid inputs", () => {
    expect(
      renderLaboratoryAnswer([{ mode: "concentration", massMg: 10, finalVolumeMl: 0 }], "fi"),
    ).toBeNull()
    expect(
      renderLaboratoryAnswer(
        [{ mode: "dilution", stockMgPerMl: 1, targetMgPerMl: 5, finalVolumeMl: 2 }],
        "en",
      ),
    ).toBeNull()
  })
  it("rejects invented references while allowing returned sources and normal links", () => {
    expect(unsupportedCitationMarkers("Claim [1], claim [2]", [{ index: 2 }])).toEqual([
      "unsupported_citation:1",
    ])
    expect(unsupportedCitationMarkers("Product [1](/en/shop/bpc-157)", [])).toEqual([])
  })
})
