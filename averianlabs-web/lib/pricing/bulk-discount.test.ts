/**
 * Tiered bulk discount — unit tests for the pure pricing logic.
 *
 * The server (orders service) and the client (cart summary) both call
 * `computeBulkDiscount` independently, so the rules need to be locked in
 * here. Any regression breaks checkout totals.
 */

import {
  BULK_TIERS,
  computeBulkDiscount,
  formatBulkTierLabel,
  nextBulkTier,
  tierFor,
} from "@/lib/pricing/bulk-discount"
import { describe, expect, it } from "vitest"

const items = (rows: Array<[string, number, number]>) =>
  rows.map(([sku, qty, unitPriceCents]) => ({ sku, qty, unitPriceCents }))

describe("computeBulkDiscount — tier selection", () => {
  it("returns zero discount below the 5-vial threshold", () => {
    const r = computeBulkDiscount(items([["BPC-157", 4, 3990]]))
    expect(r.discountCents).toBe(0)
    expect(r.hasBulkTier).toBe(false)
    expect(r.discountedSubtotalCents).toBe(4 * 3990)
  })

  it("applies 10% off for 5–10 vials", () => {
    const r = computeBulkDiscount(items([["BPC-157", 5, 100_00]]))
    expect(r.discountCents).toBe(50_00) // 10% of 500_00
    expect(r.hasBulkTier).toBe(true)
    expect(r.lines[0]?.percent).toBe(0.1)
  })

  it("applies 10% off at exactly 10 vials", () => {
    const r = computeBulkDiscount(items([["BPC-157", 10, 100_00]]))
    expect(r.discountCents).toBe(100_00) // 10% of 1000_00
    expect(r.lines[0]?.percent).toBe(0.1)
  })

  it("applies 15% off for 11–20 vials", () => {
    const r = computeBulkDiscount(items([["BPC-157", 11, 100_00]]))
    expect(r.discountCents).toBe(165_00) // 15% of 1100_00
    expect(r.lines[0]?.percent).toBe(0.15)
  })

  it("applies 15% off at exactly 20 vials", () => {
    const r = computeBulkDiscount(items([["BPC-157", 20, 100_00]]))
    expect(r.discountCents).toBe(300_00)
    expect(r.lines[0]?.percent).toBe(0.15)
  })

  it("applies 20% off at 21+ vials", () => {
    const r = computeBulkDiscount(items([["BPC-157", 21, 100_00]]))
    expect(r.discountCents).toBe(420_00)
    expect(r.lines[0]?.percent).toBe(0.2)
  })

  it("scales linearly with qty at the 20% tier", () => {
    const r = computeBulkDiscount(items([["BPC-157", 100, 100_00]]))
    expect(r.discountCents).toBe(2000_00) // 20% of 100 × 100_00
  })
})

describe("computeBulkDiscount — multi-SKU carts", () => {
  it("applies the tier per SKU, not to the cart total", () => {
    const r = computeBulkDiscount(
      items([
        ["BPC-157", 8, 100_00], // 10% tier
        ["GHK-Cu", 3, 50_00], // no tier
      ]),
    )
    expect(r.discountCents).toBe(80_00) // only BPC-157 line gets a discount
    expect(r.hasBulkTier).toBe(true)
    expect(r.lines[0]?.percent).toBe(0.1)
    expect(r.lines[1]?.percent).toBe(0)
  })

  it("handles every SKU in the top tier independently", () => {
    const r = computeBulkDiscount(
      items([
        ["BPC-157", 25, 100_00],
        ["GHK-Cu", 30, 50_00],
      ]),
    )
    expect(r.discountCents).toBe(500_00 + 300_00)
    expect(r.lines.every((l) => l.percent === 0.2)).toBe(true)
  })

  it("rounds discount cents to whole cents (no fractional cents)", () => {
    // 3990 cents × 3 vials × 10% = 1197 — exactly an integer. Pick an
    // awkward price to exercise the rounding path.
    const r = computeBulkDiscount(items([["BPC-157", 7, 3333]]))
    expect(Number.isInteger(r.discountCents)).toBe(true)
  })
})

describe("tierFor", () => {
  it("returns null below the lowest tier", () => {
    expect(tierFor(0)).toBeNull()
    expect(tierFor(4)).toBeNull()
  })

  it("returns the matching tier", () => {
    expect(tierFor(5)?.percent).toBe(0.1)
    expect(tierFor(11)?.percent).toBe(0.15)
    expect(tierFor(21)?.percent).toBe(0.2)
  })
})

describe("formatBulkTierLabel", () => {
  it("renders as −N%", () => {
    expect(formatBulkTierLabel(0.1)).toBe("−10%")
    expect(formatBulkTierLabel(0.15)).toBe("−15%")
    expect(formatBulkTierLabel(0.2)).toBe("−20%")
  })
})

describe("nextBulkTier", () => {
  it("returns the next threshold the buyer can hit", () => {
    expect(nextBulkTier(3)?.tier.minQty).toBe(5)
    expect(nextBulkTier(3)?.unitsAway).toBe(2)
    expect(nextBulkTier(7)?.tier.minQty).toBe(11)
    expect(nextBulkTier(7)?.unitsAway).toBe(4)
    expect(nextBulkTier(15)?.tier.minQty).toBe(21)
    expect(nextBulkTier(15)?.unitsAway).toBe(6)
  })

  it("returns null at the top tier so the UI can hide the nudge", () => {
    expect(nextBulkTier(21)).toBeNull()
    expect(nextBulkTier(50)).toBeNull()
  })
})

describe("BULK_TIERS", () => {
  it("contains exactly three tiers in 5–10 / 11–20 / 21+ shape", () => {
    expect(BULK_TIERS).toHaveLength(3)
    expect(BULK_TIERS.map((t) => t.minQty)).toEqual([21, 11, 5])
    expect(BULK_TIERS.map((t) => t.percent)).toEqual([0.2, 0.15, 0.1])
  })
})
