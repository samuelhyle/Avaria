// @vitest-environment happy-dom
import { ProductCard } from "@/components/product/ProductCard"
import { useCompare } from "@/lib/compare/store"
import { products } from "@/lib/products/data"
import en from "@/messages/en.json"
import fi from "@/messages/fi.json"
import { NextIntlClientProvider } from "next-intl"
import React, { act, createElement } from "react"
import { type Root, createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

const product = products.find((item) => item.slug === "bpc-157")
if (!product) throw new Error("Required reference product is missing")
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

for (const [locale, copy] of [
  ["en", en],
  ["fi", fi],
] as const) {
  function card(headingLevel?: 2 | 3) {
    return createElement(NextIntlClientProvider, {
      locale,
      timeZone: "Europe/Helsinki",
      messages: { shop: copy.shop, research: copy.research, common: copy.common },
      // biome-ignore lint/correctness/noChildrenProp: the typed provider requires children in its complete createElement props.
      children: createElement(ProductCard, { product, locale, headingLevel }),
    })
  }
  it(`${locale}: supports catalogue h1→h2 and retains h2→h3 section defaults`, () => {
    host.innerHTML = renderToStaticMarkup(card(2))
    expect(host.querySelector("article h2")?.textContent).toBe(
      product.translations?.[locale]?.name ?? product.defaultTranslation.name,
    )
    expect(host.querySelector("article h3")).toBeNull()
    host.innerHTML = renderToStaticMarkup(card())
    expect(host.querySelector("article h3")).not.toBeNull()
  })
  it(`${locale}: the accessible compare name contains its visible label in both states`, async () => {
    await act(async () => root.render(card(2)))
    const compare = [...host.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")].find(
      (item) => item.textContent === copy.shop.compareLabel,
    )
    if (!compare) throw new Error("Expected a rendered compare control")
    const visibleLabel = compare.textContent?.trim()
    expect(visibleLabel).toBe(copy.shop.compareLabel)
    expect(compare.getAttribute("aria-label")).toContain(visibleLabel)
    expect(compare.getAttribute("aria-label")).toContain(copy.shop.addToCompare)
    expect(compare.getAttribute("aria-pressed")).toBe("false")
    await act(async () => compare.click())
    expect(compare.getAttribute("aria-label")).toContain(visibleLabel)
    expect(compare.getAttribute("aria-label")).toContain(copy.shop.removeFromCompare)
    expect(compare.getAttribute("aria-pressed")).toBe("true")
  })
}
