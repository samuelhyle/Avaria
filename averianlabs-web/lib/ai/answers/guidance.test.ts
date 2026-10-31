import { describe, expect, it } from "vitest"
import { researchGuidanceTool } from "../tools/research-guidance"
import { renderGuidanceAnswer, researchGuidance } from "./guidance"

const POSITIVE_DILUTION = {
  en: "positive V₂",
  fi: "positiivinen V₂",
  sv: "positivt V₂",
  ru: "положительное V₂",
} as const

describe("reviewed scientific and platform guidance", () => {
  it.each(["en", "fi", "sv", "ru"])(
    "explains the positive dilution solution without suggesting a procedure (%s)",
    (locale) => {
      const answer = researchGuidance("dilution_limit", locale)
      expect(answer.text).toContain("V₂ ≥ V₁")
      expect(answer.text).toContain("c₂ ≤ c₁")
      expect(answer.text).toContain(POSITIVE_DILUTION[locale as keyof typeof POSITIVE_DILUTION])
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
  it("answers Swedish and Russian readers in their own language with a localised scope link", () => {
    const swedish = researchGuidance("hplc_area_purity", "sv")
    expect(swedish.text).toContain("HPLC-arearenhet")
    expect(swedish.text).toContain("fastställer inte i sig peptidens massa i en flaska")
    expect(swedish.url).toBe("/sv/lab-tests")
    const russian = researchGuidance("hplc_area_purity", "ru")
    expect(russian.text).toContain("Площадная чистота по HPLC")
    expect(russian.text).toContain("не подтверждает массу пептида во флаконе")
    expect(russian.url).toBe("/ru/lab-tests")
    const trace = [{ name: "getResearchGuidance", result: { topic: "hplc_area_purity" } }]
    expect(renderGuidanceAnswer(trace, "sv")).toContain("[Råd och avgränsning](/sv/lab-tests)")
    expect(renderGuidanceAnswer(trace, "ru")).toContain(
      "[Руководство и границы применимости](/ru/lab-tests)",
    )
  })
  it("falls back to English guidance for a locale without a reviewed translation", () => {
    expect(researchGuidance("nominal_content", "de").text).toBe(
      researchGuidance("nominal_content", "en").text,
    )
    expect(
      renderGuidanceAnswer([{ name: "getResearchGuidance", result: { topic: "memory" } }], "de"),
    ).toContain("[Guidance and scope]")
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
