import { findBatchByCode, getIndexedBatchCount, listBatchSummaries } from "@/lib/coa/lookup"
import { describe, expect, it } from "vitest"

describe("findBatchByCode", () => {
  it("resolves a known batch code to its product + batch", () => {
    const found = findBatchByCode("BAC-2026-08-A")
    expect(found).not.toBeNull()
    expect(found?.product.slug).toBe("bac-water")
    expect(found?.batch.code).toBe("BAC-2026-08-A")
  })

  it("returns null for an unknown code", () => {
    expect(findBatchByCode("DOES-NOT-EXIST")).toBeNull()
    expect(findBatchByCode("")).toBeNull()
  })

  it("exposes a stable index size for tests + health checks", () => {
    const indexed = getIndexedBatchCount()
    expect(indexed).toBeGreaterThan(0)
    expect(indexed).toBe(listBatchSummaries().length)
  })
})

describe("listBatchSummaries", () => {
  it("only includes products that have a latestBatch", () => {
    const summaries = listBatchSummaries()
    expect(summaries.length).toBeGreaterThan(0)
    for (const s of summaries) {
      // Batch codes come in two flavours: "BAC-2026-08-A" (year-month-seq)
      // and "AOD-2026-Q3-A" (year-quarter-seq). Both are accepted by the
      // registry so we only assert a reasonable shape here.
      expect(s.code).toMatch(/^[A-Z0-9]+-\d{4}-[A-Z0-9]+-[A-Z]$/)
      expect(typeof s.productName).toBe("string")
      expect(s.hplcPurity).toBeGreaterThanOrEqual(0)
      expect(s.hplcPurity).toBeLessThanOrEqual(100)
      expect(s.endotoxinEUPerMg).toBeGreaterThanOrEqual(0)
    }
  })
})
