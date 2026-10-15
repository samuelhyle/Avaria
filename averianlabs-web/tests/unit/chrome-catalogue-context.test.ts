// @vitest-environment happy-dom
import { Chrome } from "@/components/layout/Chrome"
import type { Product } from "@/lib/products/types"
import React, { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ catalogue: vi.fn() }))
vi.mock("@/lib/products/catalogue", () => ({ getStorefrontCatalogue: state.catalogue }))
vi.mock("@/lib/layout/footer-content", () => ({ getFooterContent: async () => ({}) }))
vi.mock("@/components/layout/Header", () => ({ Header: () => null }))
vi.mock("@/components/layout/Footer", () => ({ Footer: () => null }))
vi.mock("@/components/layout/ChromeIslands", () => ({ ChromeIslands: () => null }))
vi.mock("@/components/ai/chat/LazyChatWidget", async () => {
  const { createElement } = await import("react")
  const { useCatalogue } = await import("@/components/product/CatalogueProvider")
  return {
    LazyChatWidget: ({ locale, demoMode }: { locale: string; demoMode: boolean }) => {
      const products = useCatalogue()
      return createElement(
        "output",
        { "data-floating-catalogue": "true" },
        JSON.stringify({
          locale,
          demoMode,
          variants: products.flatMap((product) =>
            product.vials.map((vial) => ({ productSlug: product.slug, ...vial })),
          ),
        }),
      )
    },
  }
})

const products: Product[] = [
  {
    slug: "qa-context-material",
    category: "recovery",
    hue: 210,
    storageTemp: "",
    defaultTranslation: { name: "QA material", tagline: "QA fixture", description: "QA fixture" },
    vials: [
      {
        sku: "QA-CONTEXT-5",
        mg: 5,
        sizeValue: 5,
        sizeUnit: "mg",
        stockQty: 3,
        priceCents: 1234,
        purchaseMode: "direct",
        lowStockThreshold: null,
      },
      {
        sku: "QA-CONTEXT-10",
        mg: 10,
        sizeValue: 10,
        sizeUnit: "mg",
        stockQty: 4,
        priceCents: 2345,
        purchaseMode: "direct",
        lowStockThreshold: null,
      },
    ],
  },
]

beforeEach(() => {
  vi.stubGlobal("React", React)
  state.catalogue.mockResolvedValue(products)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it.each([
  ["en", "", false],
  ["fi", "demo", true],
])(
  "gives the floating loader the actual request catalogue and server demo flag (%s)",
  async (locale, buildMode, demoMode) => {
    vi.stubEnv("BUILD_MODE", buildMode)
    const shell = await Chrome({ locale, children: createElement("p", null, "Page content") })
    const container = document.createElement("div")
    container.innerHTML = renderToStaticMarkup(shell)
    const probes = container.querySelectorAll("[data-floating-catalogue]")
    expect(probes).toHaveLength(1)
    const received = JSON.parse(probes[0]?.textContent ?? "null")
    expect(received).toEqual({
      locale,
      demoMode,
      variants: products.flatMap((product) =>
        product.vials.map((vial) => ({ productSlug: product.slug, ...vial })),
      ),
    })
    expect(
      received.variants.find((variant: { sku: string }) => variant.sku === "QA-CONTEXT-10"),
    ).toMatchObject({
      productSlug: "qa-context-material",
      sizeValue: 10,
      sizeUnit: "mg",
      priceCents: 2345,
      stockQty: 4,
    })
  },
)
