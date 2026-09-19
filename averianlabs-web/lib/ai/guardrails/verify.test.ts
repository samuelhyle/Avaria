import { extractPrices, extractSkus, verifyResponse } from "@/lib/ai/guardrails/verify"
import { describe, expect, it } from "vitest"

describe("guardrails/verify — extractSkus", () => {
  it("matches canonical peptide-name SKUs like BPC-157", () => {
    expect(extractSkus("BPC-157 is great")).toEqual(["BPC-157"])
  })

  it("matches catalog vial SKUs like BPC157-5", () => {
    expect(extractSkus("Add BPC157-5 to cart")).toEqual(["BPC157-5"])
  })

  it("matches single-digit vial sizes like CJC-1 and AOD-5", () => {
    expect(extractSkus("CJC-1 is back in stock; AOD-5 is contact-only.").sort()).toEqual([
      "AOD-5",
      "CJC-1",
    ])
  })

  it("matches blend SKUs with two hyphens like BPC-TB-10", () => {
    expect(extractSkus("Our BPC-TB-10 blend ships within 24h.")).toEqual(["BPC-TB-10"])
  })

  it("matches long-prefix SKUs like GHKCU-50 and NAD-1000", () => {
    expect(extractSkus("GHKCU-50 and NAD-1000 are popular.").sort()).toEqual([
      "GHKCU-50",
      "NAD-1000",
    ])
  })

  it("deduplicates repeated SKUs in the same text", () => {
    expect(extractSkus("BPC-157 vs BPC-157 vs BPC-157")).toEqual(["BPC-157"])
  })

  it("does not match regulatory phrases like FDA or EMA", () => {
    expect(extractSkus("Not approved by FDA, EMA, or PMDA.")).toEqual([])
  })

  it("does not match short random words like COA-A123 (no digit-tail)", () => {
    // COA-A123 has letters after the hyphen, not digits — must not match.
    expect(extractSkus("See COA-A123 for details.")).toEqual([])
  })
})

describe("guardrails/verify — extractPrices", () => {
  it("parses USD-style prices", () => {
    const found = extractPrices("Price: $39.90")
    expect(found.length).toBe(1)
    expect(found[0]?.cents).toBe(3990)
  })

  it("parses EUR-style prices with euro symbol after the number", () => {
    const found = extractPrices("Total: 39,90 €")
    expect(found.length).toBe(1)
    expect(found[0]?.cents).toBe(3990)
  })

  it("parses EUR-style prices with the symbol before the number", () => {
    const found = extractPrices("€129.00 today")
    expect(found.length).toBe(1)
    expect(found[0]?.cents).toBe(12900)
  })

  it("links a SKU within 50 chars to the following price", () => {
    const found = extractPrices("BPC157-5 at $39.90 each")
    expect(found.length).toBe(1)
    expect(found[0]?.sku).toBe("BPC157-5")
    expect(found[0]?.cents).toBe(3990)
  })

  it("returns 0 entries when no currency marker is present", () => {
    expect(extractPrices("around 50 dollars")).toEqual([])
  })
})

describe("guardrails/verify — verifyResponse", () => {
  it("passes clean responses", () => {
    const report = verifyResponse("BPC157-10 is $69.00 and 99.2% pure.")
    expect(report.passed).toBe(true)
    expect(report.unknownSkus).toEqual([])
    expect(report.priceMismatches).toEqual([])
  })

  it("flags SKU mentions not in the catalog", () => {
    const report = verifyResponse("I recommend FAKE-99 for you.")
    expect(report.unknownSkus).toContain("FAKE-99")
    expect(report.warnings.some((w) => w.startsWith("unknown_sku"))).toBe(true)
  })

  it("flags prices that don't match the catalog (±5% tolerance)", () => {
    // BPC157-5 is 3990 cents — 100% off should trigger.
    const report = verifyResponse("BPC157-5 at $10.00 today.")
    expect(report.priceMismatches).toHaveLength(1)
    expect(report.priceMismatches[0]?.sku).toBe("BPC157-5")
  })

  it("triggers medical-claim detection", () => {
    const report = verifyResponse("This peptide is for treating chronic pain in patients.")
    expect(report.needsMedicalReminder).toBe(true)
  })

  it("does not flag regulatory agency names as SKUs", () => {
    // Regression: previously the regex would catch "FDA-approved" as a fake SKU.
    const report = verifyResponse("Not approved by the FDA or EMA.")
    expect(report.unknownSkus).toEqual([])
  })

  it("tolerates price mentions within ±5% of catalog", () => {
    // BPC157-5 is 3990 cents; +3% should pass silently.
    const report = verifyResponse("BPC157-5 at $41.10 today.")
    expect(report.priceMismatches).toEqual([])
    expect(report.passed).toBe(true)
  })

  it("flags blend SKUs that don't exist in the catalog", () => {
    const report = verifyResponse("Order FAKE-TB-99 now.")
    expect(report.unknownSkus).toContain("FAKE-TB-99")
  })

  it("flags blend SKU prices that don't match the catalog", () => {
    // Force a 100% off catalog price on a real blend SKU.
    const realBlend = extractSkus("Real blend BPC-TB-10 is $1.00.")
    expect(realBlend).toContain("BPC-TB-10")
    const report = verifyResponse("BPC-TB-10 is $1.00.")
    expect(report.priceMismatches.length).toBeGreaterThan(0)
  })

  it("triggers medical-claim detection on human-use phrasing", () => {
    const report = verifyResponse("Patients should take this peptide daily.")
    expect(report.needsMedicalReminder).toBe(true)
  })

  it("warns when the report has any issues", () => {
    const report = verifyResponse("FAKE-99 is great.")
    expect(report.passed).toBe(false)
    expect(report.warnings.length).toBeGreaterThan(0)
  })
})

describe("guardrails/verify — SKU blend edge cases", () => {
  it("extracts blend SKU before standalone SKU substring", () => {
    // `BPC-TB-10` is the blend; naive regex would also extract `TB-10` and
    // call it an unknown SKU. The blend matcher runs first and scrubs the
    // text so the generic pattern doesn't double-count.
    const out = extractSkus("Order BPC-TB-10 now.")
    expect(out).toEqual(["BPC-TB-10"])
  })

  it("dedupes across both patterns", () => {
    const out = extractSkus("BPC-157 and BPC-157 again")
    expect(out).toEqual(["BPC-157"])
  })

  it("ignores stray digits like 99.2% purity", () => {
    expect(extractSkus("HPLC purity 99.2%, endotoxin <0.1")).toEqual([])
  })
})
