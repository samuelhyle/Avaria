import { describe, expect, it } from "vitest"
import { DOCUMENT_TYPE_DESCRIPTIONS, DOCUMENT_TYPE_LABELS } from "./constants"

describe("DOCUMENT_TYPE_LABELS", () => {
  it("has a label for every document type", () => {
    const expectedTypes = ["coa", "sds", "hplc", "method", "nmr", "spec", "msds"] as const
    for (const t of expectedTypes) {
      expect(DOCUMENT_TYPE_LABELS[t]).toBeDefined()
      expect(DOCUMENT_TYPE_LABELS[t].length).toBeGreaterThan(0)
    }
  })

  it("labels are properly capitalized", () => {
    // No all-lowercase labels in the docs surface
    for (const label of Object.values(DOCUMENT_TYPE_LABELS)) {
      expect(label[0]).toBe(label[0]?.toUpperCase())
    }
  })
})

describe("DOCUMENT_TYPE_DESCRIPTIONS", () => {
  it("has a description for every document type", () => {
    for (const k of Object.keys(DOCUMENT_TYPE_LABELS)) {
      const desc = DOCUMENT_TYPE_DESCRIPTIONS[k as keyof typeof DOCUMENT_TYPE_DESCRIPTIONS]
      expect(desc).toBeDefined()
      expect(desc.length).toBeGreaterThan(10)
    }
  })
})
