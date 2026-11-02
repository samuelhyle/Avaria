import { describe, expect, it } from "vitest"
import {
  certificateLibraryHref,
  hasCertificateFilters,
  matchesCertificateField,
  matchesCertificateTerm,
  readCertificateFilters,
} from "./library"
import { isDemonstrationBatch, isDemonstrationCertificate, isPublishableCertificate } from "./types"

const CERTIFICATE = {
  productSlug: "ghk-cu",
  productName: "GHK-Cu",
  batchCode: "DEMO-GHKCU-50-202610",
  sku: "GHKCU-50",
  lab: "Demonstration laboratory",
}

describe("certificate library filters", () => {
  it("bounds user filters and rejects array ambiguity", () => {
    expect(readCertificateFilters({ q: "  a lot  ", product: ["private"], page: "-9" })).toEqual({
      q: "a lot",
      product: "",
      sku: "",
      batch: "",
      lab: "",
      minPurity: null,
      page: 1,
    })
    expect(readCertificateFilters({ q: "x".repeat(200), page: "9999" })).toMatchObject({
      q: "x".repeat(150),
      page: 500,
    })
    expect(readCertificateFilters({ page: "NaN" }).page).toBe(1)
  })

  it("accepts a purity threshold only inside the range a percentage can take", () => {
    expect(readCertificateFilters({ minPurity: "99.5" }).minPurity).toBe(99.5)
    expect(readCertificateFilters({ minPurity: "0" }).minPurity).toBeNull()
    expect(readCertificateFilters({ minPurity: "101" }).minPurity).toBeNull()
    expect(readCertificateFilters({ minPurity: "-4" }).minPurity).toBeNull()
    expect(readCertificateFilters({ minPurity: "abc" }).minPurity).toBeNull()
  })

  it("retains every filter across pagination without letting text escape the path", () => {
    const filters = readCertificateFilters({
      q: "a & b",
      product: "material",
      sku: "SKU-5",
      batch: "B/26",
      lab: "Synlab",
      minPurity: "99",
    })
    const url = new URL(certificateLibraryHref("fi", filters, 3), "https://example.invalid")
    expect(url.pathname).toBe("/fi/certificates")
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "a & b",
      product: "material",
      sku: "SKU-5",
      batch: "B/26",
      lab: "Synlab",
      minPurity: "99",
      page: "3",
    })
    expect(hasCertificateFilters(filters)).toBe(true)
    expect(hasCertificateFilters(readCertificateFilters({}))).toBe(false)
  })

  it("matches the free-text term against the lot, the product, the SKU and the laboratory", () => {
    expect(matchesCertificateTerm(CERTIFICATE, "ghk")).toBe(true)
    expect(matchesCertificateTerm(CERTIFICATE, "DEMO-GHKCU")).toBe(true)
    expect(matchesCertificateTerm(CERTIFICATE, "demonstration")).toBe(true)
    expect(matchesCertificateTerm(CERTIFICATE, "semaglutide")).toBe(false)
    expect(matchesCertificateTerm(CERTIFICATE, "")).toBe(true)
    expect(matchesCertificateField(CERTIFICATE.lab, "lab")).toBe(true)
    expect(matchesCertificateField(null, "lab")).toBe(false)
  })
})

describe("what may be published as a certificate", () => {
  it("treats a locally seeded fixture as a demonstration record", () => {
    expect(isDemonstrationBatch("local-demo-fixture")).toBe(true)
    expect(isDemonstrationBatch("Automated test fixture")).toBe(true)
    expect(isDemonstrationBatch("A. Reviewer")).toBe(false)
    expect(isDemonstrationBatch(null)).toBe(false)
  })

  it("reads the demonstration marker from the record itself, not only the reviewer", () => {
    expect(
      isDemonstrationCertificate({
        reviewedBy: "operations",
        documentTitle: "Certificate of Analysis — TEST-202610-USDC (local-test-fixture)",
      }),
    ).toBe(true)
    expect(
      isDemonstrationCertificate({ reviewedBy: "operations", lab: "Local test fixture" }),
    ).toBe(true)
    expect(
      isDemonstrationCertificate({
        reviewedBy: "operations",
        documentTitle: "Certificate of Analysis — BPC157-10-2026-08-A",
        lab: "Biolab GmbH",
      }),
    ).toBe(false)
  })

  it("publishes a lot only when its certificate document can actually be opened", () => {
    expect(isPublishableCertificate({ documentUrl: "https://example.invalid/coa.pdf" })).toBe(true)
    expect(isPublishableCertificate({ documentUrl: null })).toBe(false)
  })
})
