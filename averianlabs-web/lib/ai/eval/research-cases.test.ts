import { safeReturnPath } from "@/lib/auth/return-path"
import { referenceCatalogue } from "@/lib/products/catalogue"
import { describe, expect, it, vi } from "vitest"
import { verifyResponse } from "../guardrails/verify"
import { buildSystemPrompt } from "../prompts/system"
import { catalogueSourceVersion } from "../rag/version"
import { laboratoryCalculationTool } from "../tools/laboratory-calculation"
import { listToolDefinitions, runTool } from "../tools/registry"
import { RESEARCH_EVAL_CASES } from "./research-cases"
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }))

describe("research evaluation contracts", () => {
  it("keeps source/consent rules and Finnish wording guidance when retrieval is disabled", () => {
    const prompt = buildSystemPrompt("fi")
    expect(prompt).toContain("not product evidence")
    expect(prompt).toContain(
      "Only summarize a discussion or prepare a draft when the customer explicitly requests it",
    )
    expect(prompt).toContain("Vain laboratoriotutkimukseen")
    expect(prompt).toContain("a generic COA do not establish analyte mass")
  })
  it("contains 30 paired scenarios per target language", () => {
    expect(RESEARCH_EVAL_CASES.filter((c) => c.locale === "fi")).toHaveLength(30)
    expect(RESEARCH_EVAL_CASES.filter((c) => c.locale === "en")).toHaveLength(30)
  })
  it.each(RESEARCH_EVAL_CASES.filter((c) => c.calculation))(
    "executes deterministic maths for $locale/$id",
    async (entry) => {
      const result = await laboratoryCalculationTool.execute(entry.calculation, {
        locale: entry.locale,
        cart: [],
        transcript: [{ role: "user", content: entry.prompt, at: "2026-10-15T00:00:00Z" }],
      })
      expect(
        (result.content as { calculation: { values: Record<string, number> } }).calculation.values,
      ).toBeDefined()
      expect(
        Object.values(
          (result.content as { calculation: { values: Record<string, number> } }).calculation
            .values,
        ).every(Number.isFinite),
      ).toBe(true)
    },
  )
  it("disables write tools for live evaluation even if a model tries to invoke one", async () => {
    const ctx = { locale: "en" as const, cart: [], readOnly: true }
    const names = listToolDefinitions(ctx).map((t) => t.function.name)
    expect(names).toContain("calculateLaboratory")
    expect(names).toContain("getResearchGuidance")
    expect(names).not.toContain("createSupportTicket")
    await expect(runTool("createSupportTicket", {}, ctx)).rejects.toThrow("read_only")
  })
  it("invalidates changed specifications while keeping commercial values outside the text revision", () => {
    const original = referenceCatalogue()[0]
    if (!original) throw new Error()
    const priceChange = {
      ...original,
      vials: original.vials.map((v) => ({ ...v, stockQty: 123, priceCents: 1000 })),
    }
    expect(catalogueSourceVersion(priceChange)).toBe(catalogueSourceVersion(original))
    expect(catalogueSourceVersion({ ...original, specificationsVerified: true })).not.toBe(
      catalogueSourceVersion(original),
    )
  })
  it("detects a fabricated purity claim against a reference-only catalogue", () => {
    expect(verifyResponse("BPC157-5 has 99.9% HPLC purity", referenceCatalogue()).passed).toBe(
      false,
    )
    expect(
      verifyResponse("BPC-157 has no published batch evidence", referenceCatalogue()).passed,
    ).toBe(true)
  })
  it("returns only to this locale and application after sign-in", () => {
    expect(safeReturnPath("/fi/peptide-calculator?mode=concentration&massMg=5", "fi")).toContain(
      "massMg=5",
    )
    for (const value of [
      "//evil.example/fi/",
      "https://evil.example/fi/",
      "/fi/\\evil",
      "/en/account",
      "/fi/\naccount",
    ])
      expect(safeReturnPath(value, "fi")).toBeUndefined()
  })
})
