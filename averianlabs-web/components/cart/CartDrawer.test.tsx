/**
 * `CartDrawer` — slide-in cart overlay.
 *
 * Renders three states:
 *   - `isOpen=false`            : returns null
 *   - `isOpen=true` + 0 items   : empty state
 *   - `isOpen=true` + ≥1 item   : items list + free-shipping nudge + checkout
 *
 * We mock the zustand cart store the same way as `CheckoutSummary.test.tsx`.
 */

import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { CartDrawer } from "@/components/cart/CartDrawer"
import type { CartItem } from "@/lib/cart/store"

const messages = {
  cart: {
    drawerTitle: "Your cart",
    empty: "Your cart is empty.",
    emptyCta: "Browse catalog",
    bestSellers: "Best sellers",
    continueShopping: "← Continue shopping",
    secureCheckout: "Secure checkout",
    freeShippingProgress: "Add {amount} for free shipping",
    freeShippingUnlocked: "Free shipping unlocked",
    remove: "Remove",
    itemCount: "{count, plural, =0 {empty} one {1 item} other {{count} items}}",
    points: "Use {points} points",
    promo: "Promo code",
    promoApply: "Apply",
    subtotal: "Subtotal",
    shipping: "Shipping",
    vat: "VAT",
    total: "Total",
    checkout: "Checkout",
  },
  checkout: {
    shippingFree: "Free shipping",
  },
  common: {
    close: "Close",
    decreaseQuantity: "Decrease quantity",
    increaseQuantity: "Increase quantity",
    orderSummary: "Order summary",
  },
}

interface MockCartState {
  items: CartItem[]
  isOpen: boolean
  close: () => void
  setQty: () => void
  remove: () => void
  subtotal: () => number
  count: () => number
}

const useCartMock = vi.fn()
vi.mock("@/lib/cart/store", () => ({
  useCart: (selector: (s: MockCartState) => unknown) => useCartMock(selector),
}))

import { useCart } from "@/lib/cart/store"

function withCart(opts: {
  isOpen: boolean
  items?: CartItem[]
}) {
  const items = opts.items ?? []
  useCartMock.mockImplementation((selector: (s: MockCartState) => unknown) => {
    const state: MockCartState = {
      items,
      isOpen: opts.isOpen,
      close: () => {},
      setQty: () => {},
      remove: () => {},
      subtotal: () => items.reduce((s, i) => s + i.unitPriceCents * i.qty, 0),
      count: () => items.reduce((s, i) => s + i.qty, 0),
    }
    return selector(state)
  })
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CartDrawer locale="en" />
    </NextIntlClientProvider>,
  )
}

const sampleItem: CartItem = {
  sku: "BPC-157-5",
  productSlug: "bpc-157",
  name: "BPC-157",
  mg: 5,
  qty: 2,
  unitPriceCents: 3990,
}

describe("CartDrawer — visibility", () => {
  it("renders nothing when closed", () => {
    const html = withCart({ isOpen: false, items: [sampleItem] })
    expect(html).toBe("")
  })
})

describe("CartDrawer — empty state", () => {
  it("shows the empty message + a CTA back to the shop", () => {
    const html = withCart({ isOpen: true, items: [] })
    expect(html).toContain("Your cart is empty.")
    expect(html).toContain("Browse catalog")
    expect(html).toContain('href="/en/shop"')
  })
})

describe("CartDrawer — items + free-shipping", () => {
  it("renders each item with its name and quantity controls", () => {
    const html = withCart({
      isOpen: true,
      items: [{ ...sampleItem, qty: 2 }],
    })
    expect(html).toContain("BPC-157")
    expect(html).toContain("BPC-157-5")
    expect(html).toContain("Decrease quantity")
    expect(html).toContain("Increase quantity")
  })

  it("shows the free-shipping nudge when subtotal is below the threshold", () => {
    const html = withCart({ isOpen: true, items: [sampleItem] })
    expect(html).toContain("Add")
    expect(html).toContain("for free shipping")
  })

  it("shows the 'unlocked' message once the threshold is met", () => {
    const html = withCart({
      isOpen: true,
      items: [{ ...sampleItem, qty: 8, unitPriceCents: 2000 }],
    })
    expect(html).toContain("Free shipping unlocked")
  })

  it("never renders when isOpen=false, regardless of items", () => {
    const html = withCart({ isOpen: false, items: [sampleItem] })
    expect(html).toBe("")
  })
})
