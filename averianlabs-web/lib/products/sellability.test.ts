import { describe, expect, it } from "vitest"
import { type AvailabilityInput, describeAvailability, primaryBlocker } from "./sellability"

function input(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    purchaseMode: "direct",
    productPublished: true,
    specificationsVerified: true,
    hasReleasedBatch: true,
    hasPublicCertificate: true,
    priceCents: 3990,
    stockQty: 12,
    ...overrides,
  }
}

describe("describeAvailability", () => {
  it("reports a released, certified, stocked variant as buyable", () => {
    const availability = describeAvailability(input())
    expect(availability.buyable).toBe(true)
    expect(availability.blockers).toEqual([])
    expect(availability.action).toBe("addToCart")
  })

  it("reports a published product with no lot as not released", () => {
    const availability = describeAvailability(input({ hasReleasedBatch: false }))
    expect(availability.buyable).toBe(false)
    expect(availability.blockers).toEqual(["notReleased"])
    expect(availability.action).toBe("notifyMe")
  })

  it("reports a released lot whose certificate is not published", () => {
    const availability = describeAvailability(input({ hasPublicCertificate: false }))
    expect(availability.blockers).toEqual(["noCertificate"])
    expect(availability.action).toBe("notifyMe")
  })

  it("reports an unpublished product before anything else", () => {
    const availability = describeAvailability(
      input({ productPublished: false, hasReleasedBatch: false, stockQty: 0 }),
    )
    expect(availability.blockers).toEqual(["notPublished"])
    expect(availability.action).toBe("requestLot")
  })

  it("reports an unverified specification before a missing lot", () => {
    const availability = describeAvailability(
      input({ specificationsVerified: false, hasReleasedBatch: false }),
    )
    expect(availability.blockers).toEqual(["unverifiedSpecifications"])
    expect(availability.action).toBe("requestLot")
  })

  it("reports a sold-out lot only once the pipeline is complete", () => {
    const availability = describeAvailability(input({ stockQty: 0 }))
    expect(availability.blockers).toEqual(["outOfStock"])
    expect(availability.action).toBe("notifyMe")
  })

  it("does not report stock for a lot that does not exist", () => {
    const availability = describeAvailability(input({ hasReleasedBatch: false, stockQty: 0 }))
    expect(availability.blockers).toEqual(["notReleased"])
    expect(availability.blockers).not.toContain("outOfStock")
  })

  it("reports a missing price once the lot is certified", () => {
    const availability = describeAvailability(input({ priceCents: 0, stockQty: 0 }))
    expect(availability.blockers).toEqual(["noPrice", "outOfStock"])
    expect(availability.action).toBe("notifyMe")
  })

  it("treats a quotation as a request and nothing else", () => {
    const availability = describeAvailability(
      input({ purchaseMode: "quotation", productPublished: false, hasReleasedBatch: false }),
    )
    expect(availability.blockers).toEqual(["quotation"])
    expect(availability.action).toBe("requestLot")
  })

  it("never reports a buyable variant without a certificate", () => {
    const availability = describeAvailability(input({ hasPublicCertificate: false }))
    expect(availability.buyable).toBe(false)
    expect(availability.action).not.toBe("addToCart")
  })

  it("never reports a buyable variant without stock", () => {
    const availability = describeAvailability(input({ stockQty: 0 }))
    expect(availability.buyable).toBe(false)
  })
})

describe("primaryBlocker", () => {
  it("returns the first blocker", () => {
    const availability = describeAvailability(input({ hasPublicCertificate: false }))
    expect(primaryBlocker(availability)).toBe("noCertificate")
  })

  it("returns null for a buyable variant", () => {
    expect(primaryBlocker(describeAvailability(input()))).toBeNull()
  })

  it("returns null when there is no availability record", () => {
    expect(primaryBlocker(undefined)).toBeNull()
  })
})
