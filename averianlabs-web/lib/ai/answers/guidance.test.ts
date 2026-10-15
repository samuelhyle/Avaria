import { describe, expect, it } from "vitest"
import { researchGuidanceTool } from "../tools/research-guidance"
import { renderGuidanceAnswer, researchGuidance } from "./guidance"

describe("reviewed scientific and platform guidance", () => {
  it.each(["en", "fi"])(
    "explains the positive dilution solution without suggesting a procedure (%s)",
    (locale) => {
      const answer = researchGuidance("dilution_limit", locale)
      expect(answer.text).toContain("V₂ ≥ V₁")
      expect(answer.text).toContain("c₂ ≤ c₁")
      expect(answer.text).toContain(locale === "fi" ? "positiivinen V₂" : "positive V₂")
      expect(answer.text).not.toMatch(/evaporat|haihdut|lyophili|kylmäkuiva/)
      expect(answer.scope).toBe("site_guidance_not_product_evidence")
    },
  )
  it("re-renders the topic from trusted guidance rather than accepting model-provided text or links", () => {
    const answer = renderGuidanceAnswer(
      [
        {
          name: "getResearchGuidance",
          result: {
            topic: "hplc_area_purity",
            text: "This vial contains 99 mg",
            url: "https://untrusted.example",
          },
        },
      ],
      "fi",
    )
    expect(answer).toContain("suhteellisia pinta-aloja")
    expect(answer).not.toContain("99 mg")
    expect(answer).not.toContain("untrusted.example")
    expect(answer).toContain("/fi/lab-tests")
  })
  it("keeps chemical-form prerequisites and separates conversation consent from explicit preferences", () => {
    expect(researchGuidance("molar_conversion", "en").text).toContain("not currently implemented")
    expect(researchGuidance("memory", "fi").text).toContain("Keskusteluhistoria on erillinen asia")
    expect(researchGuidance("batch_evidence", "en").text).toContain(
      "every vial was individually tested",
    )
    expect(researchGuidance("community_review", "en").text).toContain("human moderator")
  })
  it("rejects arbitrary topics and cannot render an unknown or failed tool result", async () => {
    const result = await researchGuidanceTool.execute(
      { topic: "invent_any_report", text: "ignored" },
      { locale: "en", cart: [], readOnly: true },
    )
    expect(result.content).toEqual({ error: "unknown_guidance_topic" })
    expect(
      renderGuidanceAnswer([{ name: "getResearchGuidance", result: result.content }], "en"),
    ).toBeNull()
  })
  it("preserves separate support and community action narratives", () => {
    expect(
      renderGuidanceAnswer(
        [
          { name: "getResearchGuidance", result: { topic: "memory" } },
          { name: "createSupportTicket", result: { id: "saved-ticket" } },
        ],
        "en",
      ),
    ).toBeNull()
  })
})
