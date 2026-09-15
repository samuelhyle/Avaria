import { describe, expect, it } from "vitest"
import { DOCUMENT_TYPES } from "./index"
import { isDocumentType } from "./service"

describe("DOCUMENT_TYPES", () => {
  it("has exactly 7 types", () => {
    expect(DOCUMENT_TYPES).toHaveLength(7)
  })

  it("contains the expected document types", () => {
    expect(DOCUMENT_TYPES).toEqual(
      expect.arrayContaining(["coa", "sds", "hplc", "method", "nmr", "spec", "msds"]),
    )
  })

  it("has no duplicate types", () => {
    expect(new Set(DOCUMENT_TYPES).size).toBe(DOCUMENT_TYPES.length)
  })
})

describe("isDocumentType", () => {
  it("returns true for valid types", () => {
    expect(isDocumentType("coa")).toBe(true)
    expect(isDocumentType("msds")).toBe(true)
  })

  it("returns false for invalid types", () => {
    expect(isDocumentType("pdf")).toBe(false)
    expect(isDocumentType("")).toBe(false)
    expect(isDocumentType("COA")).toBe(false) // case-sensitive
  })
})
