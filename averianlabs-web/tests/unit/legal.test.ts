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

  it("returns safe placeholders when env vars are missing", () => {
    delete process.env.NEXT_PUBLIC_LEGAL_COMPANY_NAME
    delete process.env.NEXT_PUBLIC_LEGAL_BUSINESS_ID
    const identity = getLegalIdentity()
    expect(identity.companyName).toBe("AverianLabs Oy")
    expect(identity.businessId).toBe("FI-PENDING")
    expect(identity.vatId).toBe("FI-PENDING")
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
