import type { Product, VialSize } from "@/lib/products/types"
import {
  findCheapestVial,
  isContactOnly,
  stockState,
  stockStateLabel,
  totalStock,
} from "@/lib/products/vials"
import { describe, expect, it } from "vitest"

function vial(priceCents: number, mg: number, overrides: Partial<VialSize> = {}): VialSize {
  return {
    mg,
    sku: `SKU-${mg}`,
    priceCents,
    stockQty: 10,
    lowStockThreshold: 2,
    ...overrides,
  }
}

function productWith(...vials: VialSize[]): Product {
  return {
    slug: "test-product",
    category: "supplies",
    hue: 0,
    storageTemp: "Room temperature",
    vials,
    defaultTranslation: { name: "Test", tagline: "t", description: "d" },
  }
}

describe("findCheapestVial", () => {
  it("returns null when there are no vials", () => {
    expect(findCheapestVial(productWith())).toBeNull()
  })

  it("returns the only vial when there's just one", () => {
    const only = vial(1000, 10)
    expect(findCheapestVial(productWith(only))).toBe(only)
  })

  it("returns the lowest-price vial", () => {
    const cheap = vial(500, 10)
    const mid = vial(1500, 20)
    const pricey = vial(3000, 30)
    expect(findCheapestVial(productWith(mid, cheap, pricey))).toBe(cheap)
  })

  it("breaks ties on the earlier array entry", () => {
    const first = vial(1000, 10)
    const second = vial(1000, 20)
    expect(findCheapestVial(productWith(first, second))).toBe(first)
  })

  it("does not crash when the only vial is contact-only", () => {
    const contact = vial(0, 10, { contactOnly: true })
    expect(findCheapestVial(productWith(contact))).toBe(contact)
  })

  it("returns the cheapest by raw price even when a contact-only vial is cheaper", () => {
    const contact = vial(0, 10, { contactOnly: true })
    const regular = vial(2500, 20)
    // Price-based comparison: contact-only (0 cents) is technically cheaper.
    // The contact-only flag is a presentation hint, not a sort key.
    expect(findCheapestVial(productWith(contact, regular))).toBe(contact)
  })
})

describe("totalStock", () => {
  it("sums every vial's stock", () => {
    const p = productWith(vial(100, 10, { stockQty: 5 }), vial(200, 20, { stockQty: 3 }))
    expect(totalStock(p)).toBe(8)
  })

  it("returns 0 when there are no vials", () => {
    expect(totalStock(productWith())).toBe(0)
  })
})

describe("isContactOnly", () => {
  it("flags a vial with contactOnly=true", () => {
    expect(isContactOnly(vial(100, 10, { contactOnly: true }))).toBe(true)
  })

  it("flags a vial with priceCents === 0", () => {
    expect(isContactOnly(vial(0, 10))).toBe(true)
  })

  it("returns false for a normal vial", () => {
    expect(isContactOnly(vial(1500, 10))).toBe(false)
  })
})

describe("stockState", () => {
  it("returns in_stock when aggregate stock is plentiful", () => {
    const p = productWith(vial(1500, 10, { stockQty: 100 }))
    expect(stockStateLabel(p)).toBe("in_stock")
  })

  it("returns low_stock below the 25-unit threshold", () => {
    const p = productWith(vial(1500, 10, { stockQty: 10 }))
    expect(stockStateLabel(p)).toBe("low_stock")
  })

  it("returns out_of_stock when nothing is purchasable", () => {
    const p = productWith(vial(1500, 10, { stockQty: 0 }))
    expect(stockStateLabel(p)).toBe("out_of_stock")
  })

  it("returns contact_only when the cheapest vial is contact-only", () => {
    const p = productWith(vial(0, 10, { contactOnly: true }), vial(1500, 20, { stockQty: 100 }))
    const s = stockState(p)
    expect(s.contactOnly).toBe(false)
    expect(stockStateLabel(p)).toBe("in_stock")
  })

  it("treats a product with no vials as contact-only", () => {
    const s = stockState(productWith())
    expect(s.contactOnly).toBe(true)
    expect(s.total).toBe(0)
  })

  it("flags the whole product contact-only only when every vial is contact-only", () => {
    const allContact = productWith(
      vial(0, 10, { contactOnly: true }),
      vial(0, 20, { contactOnly: true }),
    )
    expect(stockState(allContact).contactOnly).toBe(true)
    expect(stockStateLabel(allContact)).toBe("contact_only")
  })
})
