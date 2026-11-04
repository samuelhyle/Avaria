// @vitest-environment happy-dom
import { ProductCard } from "@/components/product/ProductCard"
import { useCompare } from "@/lib/compare/store"
import type { AvailabilityBlocker, Product } from "@/lib/products/types"
import en from "@/messages/en.json"
import fi from "@/messages/fi.json"
import { NextIntlClientProvider } from "next-intl"
import React, { act, createElement } from "react"
import { type Root, createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The state a catalogue card carries.
 *
 * The card used to label every material that could not be ordered "out of
 * stock", which is false for a product whose lot was never released. The
 * badge now names the step of the release pipeline that is still open.
 */

function product(blocker: AvailabilityBlocker): Product {
  return {
    slug: "test-product",
    category: "recovery",
    hue: 190,
    dataSource: "database",
    storageTemp: "",
    defaultTranslation: { name: "Test product", tagline: "A tagline", description: "" },
    translations: { en: { name: "Test product", tagline: "A tagline", description: "" } },
    vials: [
      {
        mg: 5,
        sizeValue: 5,
        sizeUnit: "mg",
        sku: "TEST-5",
        priceCents: 0,
        stockQty: 0,
        lowStockThreshold: null,
        purchaseMode: "unavailable",
        availability: { buyable: false, blockers: [blocker], action: "requestLot" },
      },
    ],
  } as Product
}

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.stubGlobal("React", React)
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  useCompare.setState({ items: [] })
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  useCompare.setState({ items: [] })
  vi.unstubAllGlobals()
})

function card(locale: "en" | "fi", copy: typeof en | typeof fi, item: Product) {
  return createElement(NextIntlClientProvider, {
    locale,
    timeZone: "Europe/Helsinki",
    messages: { shop: copy.shop, research: copy.research, common: copy.common },
    // biome-ignore lint/correctness/noChildrenProp: the typed provider requires children in its complete createElement props.
    children: createElement(ProductCard, { product: item, locale }),
  })
}

describe("the catalogue card's availability badge", () => {
  it("en: names the missing step instead of claiming the lot is sold out", async () => {
    await act(async () => root.render(card("en", en, product("notPublished"))))
    const text = host.textContent ?? ""
    expect(text).toContain(en.shop.availabilityBadge.notPublished)
    expect(text).not.toContain(en.shop.availabilityBadge.outOfStock)
  })

  it("fi: names the missing step instead of claiming the lot is sold out", async () => {
    await act(async () => root.render(card("fi", fi, product("notReleased"))))
    const text = host.textContent ?? ""
    expect(text).toContain(fi.shop.availabilityBadge.notReleased)
    expect(text).not.toContain(fi.shop.availabilityBadge.outOfStock)
  })

  it("does not repeat 'on request' twice on one card", async () => {
    await act(async () => root.render(card("en", en, product("quotation"))))
    const text = host.textContent ?? ""
    expect(text).toContain(en.shop.pricingOnRequest)
    expect(text.split(en.shop.pricingOnRequest).length - 1).toBe(1)
  })
})
