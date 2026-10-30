import { CHAINS, confirmationsSince, fromUnits, toUnits } from "@/lib/crypto/chains"
import {
  type Promotion,
  computePromotionDiscount,
  normalisePromotionCode,
} from "@/lib/promotions/service"
import { describe, expect, it } from "vitest"

/**
 * The money arithmetic.
 *
 * Every crypto amount is handled as an integer number of the asset's smallest
 * unit. Floating point is not used anywhere in the money path, because
 * 0.1 + 0.2 is not 0.3 and a customer who is short by a rounding error
 * should not be told they underpaid.
 */

describe("crypto amounts", () => {
  it("converts a decimal string into whole units", () => {
    expect(toUnits("0.1", 8)).toBe(10_000_000n)
    expect(toUnits("1.5", 6)).toBe(1_500_000n)
    expect(toUnits("1", 8)).toBe(100_000_000n)
    expect(toUnits("0", 8)).toBe(0n)
  })

  it("rejects an amount the chain could not express", () => {
    // More decimals than the asset supports.
    expect(toUnits("0.000000001", 8)).toBeNull()
    expect(toUnits("1.1234567", 6)).toBeNull()
    // Not a number at all.
    expect(toUnits("abc", 8)).toBeNull()
    expect(toUnits("", 8)).toBeNull()
    expect(toUnits("-1", 8)).toBeNull()
  })

  it("round-trips without drift", () => {
    for (const amount of ["0.1", "0.00083166", "1.5", "123.456789"]) {
      expect(fromUnits(toUnits(amount, 8)!, 8)).toBe(amount.replace(/0+$/, ""))
    }
  })

  it("renders whole units without trailing zeroes", () => {
    expect(fromUnits(10_000_000n, 8)).toBe("0.1")
    expect(fromUnits(100_000_000n, 8)).toBe("1")
    expect(fromUnits(1n, 8)).toBe("0.00000001")
  })

  it("counts confirmations from the chain tip", () => {
    expect(confirmationsSince(100, 100)).toBe(1)
    expect(confirmationsSince(100, 102)).toBe(3)
    // Not in a block yet: no confirmations at all.
    expect(confirmationsSince(null, 100)).toBe(0)
    expect(confirmationsSince(undefined, 100)).toBe(0)
    // Without a tip there is nothing to count against.
    expect(confirmationsSince(100, null)).toBe(0)
    // A block ahead of the tip is impossible; treat it as unconfirmed.
    expect(confirmationsSince(101, 100)).toBe(0)
  })

  it("gives every chain a confirmation rule and a tolerance", () => {
    for (const chain of Object.values(CHAINS)) {
      expect(chain.requiredConfirmations).toBeGreaterThan(0)
      expect(chain.toleranceUnits).toBeGreaterThanOrEqual(0)
      expect(chain.decimals).toBeGreaterThan(0)
    }
  })
})

describe("promotion discounts", () => {
  const base: Promotion = {
    id: "p",
    code: "TEST",
    kind: "percent",
    value: 10,
    minSubtotalCents: 0,
    maxRedemptions: null,
    redemptionCount: 0,
    active: true,
    startsAt: null,
    endsAt: null,
    label: null,
  }

  it("takes a percentage of the subtotal", () => {
    const result = computePromotionDiscount({ ...base, value: 10 }, 6500)
    expect(result.discountCents).toBe(650)
    expect(result.freeShipping).toBe(false)
  })

  it("never discounts more than the subtotal", () => {
    const result = computePromotionDiscount({ ...base, value: 100 }, 6500)
    expect(result.discountCents).toBe(6500)
  })

  it("never returns a negative discount", () => {
    const result = computePromotionDiscount({ ...base, value: -50 }, 6500)
    expect(result.discountCents).toBe(0)
  })

  it("takes a fixed amount, capped at the subtotal", () => {
    expect(
      computePromotionDiscount({ ...base, kind: "fixed", value: 1500 }, 6500).discountCents,
    ).toBe(1500)
    expect(
      computePromotionDiscount({ ...base, kind: "fixed", value: 9999 }, 6500).discountCents,
    ).toBe(6500)
  })

  it("waives the delivery charge for a free-shipping code", () => {
    const result = computePromotionDiscount({ ...base, kind: "free_shipping", value: 0 }, 6500)
    expect(result.freeShipping).toBe(true)
    expect(result.discountCents).toBe(0)
  })

  it("normalises a code to the stored form", () => {
    expect(normalisePromotionCode("  research10 ")).toBe("RESEARCH10")
    // A hyphen is allowed in a code, and is kept.
    expect(normalisePromotionCode("avaria-10")).toBe("AVARIA-10")
    expect(normalisePromotionCode("a b!c")).toBe("ABC")
    expect(normalisePromotionCode("")).toBe("")
  })
})
