import { describe, expect, it } from "vitest"
import {
  documentAppliesToSku,
  documentLibraryHref,
  hasDocumentFilters,
  literalSearchPattern,
  readDocumentFilters,
} from "./library"

describe("public document library context", () => {
  it("bounds user filters, rejects array/type ambiguity and normalises paging", () => {
    expect(
      readDocumentFilters({ q: "  a record  ", product: ["private"], type: "private", page: "-9" }),
    ).toEqual({ q: "a record", product: "", sku: "", batch: "", type: undefined, page: 1 })
    expect(readDocumentFilters({ q: "x".repeat(200), page: "9999", type: "coa" })).toMatchObject({
      q: "x".repeat(150),
      page: 500,
      type: "coa",
    })
    expect(readDocumentFilters({ page: "NaN" }).page).toBe(1)
  })
  it("retains all filters across pagination without treating query text as a path", () => {
    const filters = readDocumentFilters({
      q: "a & b",
      product: "material",
      sku: "SKU-5",
      batch: "B/26",
      type: "sds",
    })
    const url = new URL(documentLibraryHref("fi", filters, 3), "https://example.invalid")
    expect(url.pathname).toBe("/fi/documents")
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "a & b",
      product: "material",
      sku: "SKU-5",
      batch: "B/26",
      type: "sds",
      page: "3",
    })
    expect(hasDocumentFilters(filters)).toBe(true)
    expect(hasDocumentFilters(readDocumentFilters({}))).toBe(false)
  })
  it("uses literal search text instead of making percent/underscore query wildcards", () => {
    expect(literalSearchPattern("5%_\\")).toBe("%5\\%\\_\\\\%")
  })
  it("retains product-wide scope and never assigns another SKU's batch document", () => {
    expect(documentAppliesToSku({ batchId: null }, "SKU-5")).toBe(true)
    expect(documentAppliesToSku({ batchId: "batch", batchSku: "SKU-5" }, "SKU-5")).toBe(true)
    expect(documentAppliesToSku({ batchId: "batch", batchSku: "SKU-10" }, "SKU-5")).toBe(false)
    expect(documentAppliesToSku({ batchId: "batch", batchSku: null }, "SKU-5")).toBe(false)
  })
})
