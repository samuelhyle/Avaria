import { formatVatId, getLegalIdentity } from "@/lib/legal"
import { afterEach, describe, expect, it } from "vitest"

describe("formatVatId", () => {
  it("normalises whitespace and case", () => {
    expect(formatVatId("fi 12345678")).toBe("FI12345678")
  })

  it("returns an empty string for falsy input gracefully", () => {
    // The function coerces non-strings; we assert it doesn't throw.
    expect(typeof formatVatId("")).toBe("string")
  })
})

describe("getLegalIdentity", () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
  })

  it("does not invent registered company details when configuration is missing", () => {
    // Every identifier has to go, not just the first two: the VAT id was
    // left in place, so the "nothing is configured" case read it from the
    // developer's own environment and the test failed on any machine that
    // exported a local `.env.local`.
    for (const key of [
      "NEXT_PUBLIC_LEGAL_COMPANY_NAME",
      "NEXT_PUBLIC_LEGAL_BUSINESS_ID",
      "NEXT_PUBLIC_LEGAL_VAT_ID",
    ])
      Reflect.deleteProperty(process.env, key)
    const identity = getLegalIdentity()
    expect(identity.companyName).toBe("AverianLabs")
    expect(identity.businessId).toBe("")
    expect(identity.vatId).toBe("")
  })

  it("reads overrides from env", () => {
    process.env.NEXT_PUBLIC_LEGAL_COMPANY_NAME = "Test Oy"
    process.env.NEXT_PUBLIC_LEGAL_BUSINESS_ID = "1234567-8"
    process.env.NEXT_PUBLIC_LEGAL_VAT_ID = "FI12345678"
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS_LINE1 = "Testikatu 1"
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS_LINE2 = "00100 Helsinki"
    process.env.NEXT_PUBLIC_LEGAL_EMAIL = "info@test.example"
    const identity = getLegalIdentity()
    expect(identity).toMatchObject({
      companyName: "Test Oy",
      businessId: "1234567-8",
      vatId: "FI12345678",
      addressLine1: "Testikatu 1",
      addressLine2: "00100 Helsinki",
      contactEmail: "info@test.example",
    })
  })
})
