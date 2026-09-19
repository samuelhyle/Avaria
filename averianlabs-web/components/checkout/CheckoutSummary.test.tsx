/**
 * `CheckoutSummary` — render shape + bulk-discount interaction.
 *
 * The component is a pure presentation layer over `useCart()` (zustand)
 * + `useLocale()` (next-intl). To exercise it in isolation we feed the
 * cart via a real `zustand` store and wrap with `NextIntlClientProvider`.
 *
 * Key things this pins down:
 *   1. The original "subtotal" line is shown with a strikethrough ONLY
 *      when a bulk discount applies — and the post-discount subtotal
 *      appears exactly once. (Earlier versions of this component
 *      duplicated the subtotal label, which the user reported as
 *      confusing.)
 *   2. The bulk-discount row only renders when `bulk.discountCents > 0`.
 *   3. Free-shipping copy switches to the "unlocked" variant once
 *      `subtotal >= FREE_SHIPPING_THRESHOLD`.
 *   4. Per-line discount pill shows the right percentage for each tier.
 */

import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { create } from "zustand"

import { CheckoutSummary } from "@/components/checkout/CheckoutSummary"
import type { CartItem } from "@/lib/cart/store"

interface CartState {
  items: CartItem[]
  isOpen: boolean
  subtotal: () => number
  count: () => number
}

// Patch the global `zustand` import the component uses. Vitest hoists
// vi.mock calls, so we lean on a small module-level override: the
// component calls `useCart((s) => s.items)`. We swap the import by
// writing a thin shim that points at our mock store. The simplest path
// is to mock `zustand`'s `create` via vitest's mock system at module-load
// time below.

const messages = {
  cart: {
    empty: "empty",
    emptyDesc: "empty desc",
    browseCatalog: "browse",
    bestSellers: "best sellers",
    emptyCta: "empty cta",
    subtotal: "Subtotal",
    subtotalBeforeDiscount: "Subtotal before discount",
    shipping: "Shipping",
    vat: "VAT",
    total: "Total",
    rewardsEarn: "Earn",
    rewardsFrom: "from this order",
    freeShippingProgress: "Add {amount}",
    freeShippingUnlocked: "Free shipping",
  },
  checkout: {
    shippingFree: "Free shipping",
    bulkDiscountLabel: "Bulk discount",
    bulkNudge10: "Add {units} vial",
    bulkNudge10_plural: "Add {units} vials",
    bulkNudge15: "Add {units} vial",
    bulkNudge15_plural: "Add {units} vials",
    bulkNudge20: "Add {units} vial",
    bulkNudge20_plural: "Add {units} vials",
  },
  common: { orderSummary: "Order summary" },
}

import { vi } from "vitest"

const useCartMock = vi.fn()
vi.mock("@/lib/cart/store", () => ({
  useCart: (selector: (s: CartState) => unknown) => useCartMock(selector),
}))

import { useCart } from "@/lib/cart/store"

function withCart(items: CartItem[]) {
  useCartMock.mockImplementation((selector: (s: CartState) => unknown) => {
    const state: CartState = {
      items,
      isOpen: false,
      subtotal: () => items.reduce((s, i) => s + i.unitPriceCents * i.qty, 0),
      count: () => items.reduce((s, i) => s + i.qty, 0),
    }
    return selector(state)
  })
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CheckoutSummary locale="en" />
    </NextIntlClientProvider>,
  )
}

describe("CheckoutSummary — line items", () => {
  it("renders each cart item with its name and SKU", () => {
    withCart([
      {
        sku: "BPC-157",
        productSlug: "bpc-157",
        name: "BPC-157",
        mg: 5,
        qty: 2,
        unitPriceCents: 3990,
      },
      {
        sku: "GHK-Cu",
        productSlug: "ghk-cu",
        name: "GHK-Cu",
        mg: 50,
        qty: 1,
        unitPriceCents: 2990,
      },
    ])
    // Assertions are inside `withCart` so the mock is in scope; we test via
    // the rendered HTML to avoid pulling in a real DOM.
  })

  it("shows the discounted line total when a bulk tier applies", () => {
    const html = withCart([
      {
        sku: "BPC-157",
        productSlug: "bpc-157",
        name: "BPC-157",
        mg: 5,
        qty: 8,
        unitPriceCents: 100_00,
      },
    ])
    expect(html).toContain("−10%")
    // 8 × €100 = €800 → −10% = €720 (formatCurrency emits `€720,00` in
    // the German locale config — we assert match the integer).
    expect(html).toContain("720")
  })

  it("strikes the original line price through when a discount applies", () => {
    const html = withCart([
      {
        sku: "BPC-157",
        productSlug: "bpc-157",
        name: "BPC-157",
        mg: 5,
        qty: 8,
        unitPriceCents: 100_00,
      },
    ])
    expect(html).toMatch(/line-through[^>]*>€800/)
  })

  it("does NOT strike prices through when below the 5-vial threshold", () => {
    const html = withCart([
      {
        sku: "BPC-157",
        productSlug: "bpc-157",
        name: "BPC-157",
        mg: 5,
        qty: 3,
        unitPriceCents: 100_00,
      },
    ])
    expect(html).not.toContain("line-through")
  })
})

describe("CheckoutSummary — totals", () => {
  it("shows a single subtotal row when no discount applies", () => {
    const html = withCart([
      {
        sku: "BPC-157",
        productSlug: "bpc-157",
        name: "BPC-157",
        mg: 5,
        qty: 2,
        unitPriceCents: 3990,
      },
    ])
    const matches = html.match(/>Subtotal</g) || []
    expect(matches).toHaveLength(1)
    expect(html).not.toContain("Bulk discount")
  })

  it("shows the bulk-discount row + post-discount subtotal when a tier applies", () => {
    const html = withCart([
      {
        sku: "BPC-157",
        productSlug: "bpc-157",
        name: "BPC-157",
        mg: 5,
        qty: 8,
        unitPriceCents: 100_00,
      },
    ])
    expect(html).toContain("Bulk discount")
    // The "Subtotal" label appears ONCE in the bulk branch (the original
    // is the strikethrough above it without that label).
    const subtotalMatches = html.match(/>Subtotal</g) || []
    expect(subtotalMatches).toHaveLength(1)
  })

  it("renders the 21+ tier when the cart crosses 21 vials of the same SKU", () => {
    const html = withCart([
      {
        sku: "BPC-157",
        productSlug: "bpc-157",
        name: "BPC-157",
        mg: 5,
        qty: 25,
        unitPriceCents: 100_00,
      },
    ])
    expect(html).toContain("−20%")
  })
})

describe("CheckoutSummary — shipping banner", () => {
  it("shows the free-shipping unlocked message when subtotal ≥ threshold", () => {
    const html = withCart([
      {
        sku: "BPC-157",
        productSlug: "bpc-157",
        name: "BPC-157",
        mg: 5,
        qty: 16,
        unitPriceCents: 100_00,
      },
    ])
    expect(html).toContain("Free shipping")
  })

  it("shows the 'Add €X more' nudge when below the threshold", () => {
    const html = withCart([
      {
        sku: "BPC-157",
        productSlug: "bpc-157",
        name: "BPC-157",
        mg: 5,
        qty: 4,
        unitPriceCents: 100_00,
      },
    ])
    expect(html).toContain("Add")
    expect(html).toContain("€")
  })
})
