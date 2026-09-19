/**
 * Order pricing math — `computeOrderTotals`, FREE_SHIPPING_THRESHOLD, VAT.
 *
 * These primitives are the source of truth for the cart UI + the
 * authoritative server-side total at checkout. A regression here is a
 * "we charged the customer the wrong amount" outage.
 */

import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  VAT_LABEL,
  VAT_RATE,
  computeOrderTotals,
  computeVatCents,
} from "@/lib/pricing"
import { describe, expect, it } from "vitest"

describe("VAT_RATE + VAT_LABEL", () => {
  it("matches the launch-scope rate", () => {
    expect(VAT_RATE).toBe(0.255)
    expect(VAT_LABEL).toBe("25.5%")
  })
})

describe("computeVatCents", () => {
  it("rounds to the nearest cent", () => {
    expect(computeVatCents(1000)).toBe(255) // 25.5% of €10 = €2.55
    expect(computeVatCents(0)).toBe(0)
  })

  it("never returns a fractional cent", () => {
    for (const amount of [1, 7, 99, 333, 12345, 99_999]) {
      expect(Number.isInteger(computeVatCents(amount))).toBe(true)
    }
  })

  it("matches the published rate within rounding error", () => {
    const v = computeVatCents(10_000)
    expect(Math.abs(v - Math.round(10_000 * VAT_RATE))).toBeLessThanOrEqual(1)
  })
})

describe("FREE_SHIPPING_THRESHOLD_CENTS", () => {
  it("is the documented €150 threshold", () => {
    expect(FREE_SHIPPING_THRESHOLD_CENTS).toBe(15_000)
  })
})

describe("computeOrderTotals", () => {
  it("returns vat + subtotal + shipping", () => {
    const { vatCents, totalCents } = computeOrderTotals(10_000, 990)
    expect(vatCents).toBe(2550)
    expect(totalCents).toBe(10_000 + 990 + 2550)
  })

  it("still charges VAT when shipping is free", () => {
    const { vatCents, totalCents } = computeOrderTotals(20_000, 0)
    expect(vatCents).toBe(5100)
    expect(totalCents).toBe(20_000 + 0 + 5100)
  })

  it("zero subtotal yields zero VAT", () => {
    const { vatCents, totalCents } = computeOrderTotals(0, 0)
    expect(vatCents).toBe(0)
    expect(totalCents).toBe(0)
  })

  it("rounds VAT correctly for awkward amounts", () => {
    // €99.99 × 25.5% = €25.4974 → rounds to 2550 cents (since 2549.745 → 2550)
    const { vatCents } = computeOrderTotals(9_999, 0)
    expect(vatCents).toBe(2550)
  })
})
