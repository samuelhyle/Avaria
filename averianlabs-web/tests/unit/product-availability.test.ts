// @vitest-environment happy-dom
import { ProductAvailability } from "@/components/product/ProductAvailability"
import type { Availability, AvailabilityBlocker } from "@/lib/products/types"
import en from "@/messages/en.json"
import fi from "@/messages/fi.json"
import { NextIntlClientProvider } from "next-intl"
import React, { act, createElement } from "react"
import { type Root, createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.stubGlobal("React", React)
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function availability(blocker: AvailabilityBlocker, action: Availability["action"]): Availability {
  return { buyable: false, blockers: [blocker], action }
}

function panel(locale: "en" | "fi", state: Availability, messages: typeof en | typeof fi) {
  return createElement(NextIntlClientProvider, {
    locale,
    timeZone: "Europe/Helsinki",
    messages: {
      product: messages.product,
      research: messages.research,
      common: messages.common,
    },
    // biome-ignore lint/correctness/noChildrenProp: the typed provider requires children in its complete createElement props.
    children: createElement(ProductAvailability, {
      availability: state,
      sku: "BPC157-5",
      productName: "BPC-157",
      sizeLabel: "5 mg",
      locale,
    }),
  })
}

describe("ProductAvailability", () => {
  it("en: names the step of the release pipeline that is still open", async () => {
    await act(async () => root.render(panel("en", availability("notReleased", "notifyMe"), en)))
    const section = host.querySelector('[data-testid="product-availability"]')
    expect(section?.getAttribute("data-blocker")).toBe("notReleased")
    expect(section?.textContent).toContain(en.product.availability.notReleased.title)
    expect(section?.textContent).toContain(en.product.availability.notReleased.body)
  })

  it("fi: names the step of the release pipeline that is still open", async () => {
    await act(async () => root.render(panel("fi", availability("notReleased", "notifyMe"), fi)))
    const section = host.querySelector('[data-testid="product-availability"]')
    expect(section?.textContent).toContain(fi.product.availability.notReleased.title)
  })

  it("offers a request, not a notification, when the team has to confirm something", async () => {
    await act(async () => root.render(panel("en", availability("quotation", "requestLot"), en)))
    const section = host.querySelector('[data-testid="product-availability"]')
    expect(section?.getAttribute("data-action")).toBe("requestLot")
    expect(host.querySelector('[data-testid="notify-submit"]')).toBeNull()
    expect(host.querySelector('[data-testid="quote-submit"]')).not.toBeNull()
    // The request says what is being asked about.
    expect(section?.textContent).toContain("BPC-157")
    expect(section?.textContent).toContain("5 mg")
    expect(section?.textContent).toContain("BPC157-5")
  })

  it("offers a notification when only time is missing", async () => {
    await act(async () => root.render(panel("en", availability("outOfStock", "notifyMe"), en)))
    const section = host.querySelector('[data-testid="product-availability"]')
    expect(section?.getAttribute("data-action")).toBe("notifyMe")
    expect(host.querySelector('[data-testid="notify-submit"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="quote-submit"]')).toBeNull()
  })

  it("records the address and confirms it", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }))
    vi.stubGlobal("fetch", fetchMock)
    await act(async () => root.render(panel("en", availability("outOfStock", "notifyMe"), en)))

    const form = host.querySelector("form") as HTMLFormElement
    const input = host.querySelector('input[name="email"]') as HTMLInputElement
    input.value = "researcher@example.invalid"
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(init.method)).toBe("POST")
    expect(String(init.body)).toContain("BPC157-5")
    expect(String(init.body)).toContain("researcher@example.invalid")
    await act(async () => {
      await Promise.resolve()
    })
    expect(host.querySelector('[data-testid="notify-done"]')?.textContent).toContain(
      en.product.notifySubmitted,
    )
  })

  it("says nothing when the variant can be ordered", async () => {
    await act(async () =>
      root.render(panel("en", { buyable: true, blockers: [], action: "addToCart" }, en)),
    )
    expect(host.querySelector('[data-testid="product-availability"]')).toBeNull()
  })
})
