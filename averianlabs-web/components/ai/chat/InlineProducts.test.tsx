/**
 * `InlineProducts` + `extractProducts` — the chat-bubble product cards.
 *
 * Pure-function `extractProducts` is unit-tested here; the render
 * component is smoke-tested by rendering with a fixture list.
 */

import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { InlineProducts, extractProducts } from "@/components/ai/chat/InlineProducts"
import type { ToolTrace } from "@/components/ai/chat/types"

describe("extractProducts", () => {
  it("returns an empty list when no trace is provided", () => {
    expect(extractProducts(undefined, "en")).toEqual([])
    expect(extractProducts([], "en")).toEqual([])
  })

  it("extracts product cards from a searchProducts result", () => {
    const trace: ToolTrace[] = [
      {
        id: "1",
        name: "searchProducts",
        args: {},
        result: {
          results: [
            {
              slug: "bpc-157",
              name: "BPC-157",
              url: "/en/shop/bpc-157",
              purityPercent: 99.2,
              vials: [{ priceCents: 3990 }, { priceCents: 6990 }],
            },
          ],
        },
      },
    ]
    const cards = extractProducts(trace, "en")
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      slug: "bpc-157",
      name: "BPC-157",
      url: "/en/shop/bpc-157",
      purityPercent: 99.2,
      fromPriceCents: 3990,
    })
  })

  it("dedupes the same slug across multiple tool calls", () => {
    const trace: ToolTrace[] = [
      {
        id: "1",
        name: "searchProducts",
        args: {},
        result: {
          results: [
            { slug: "bpc-157", name: "BPC-157", url: "/en/shop/bpc-157", purityPercent: 99 },
          ],
        },
      },
      {
        id: "2",
        name: "getProduct",
        args: {},
        result: { slug: "bpc-157", name: "BPC-157 (full)" },
      },
    ]
    const cards = extractProducts(trace, "en")
    expect(cards).toHaveLength(1)
  })

  it("falls back to a locale-prefixed URL when the tool didn't include one", () => {
    const trace: ToolTrace[] = [
      {
        id: "1",
        name: "getProduct",
        args: {},
        result: { slug: "bpc-157", name: "BPC-157" },
      },
    ]
    const cards = extractProducts(trace, "de")
    expect(cards[0]?.url).toBe("/de/shop/bpc-157")
  })

  it("caps the result at 4 cards so the chat bubble stays readable", () => {
    const trace: ToolTrace[] = [
      {
        id: "1",
        name: "searchProducts",
        args: {},
        result: {
          results: [
            { slug: "a", name: "A" },
            { slug: "b", name: "B" },
            { slug: "c", name: "C" },
            { slug: "d", name: "D" },
            { slug: "e", name: "E" },
            { slug: "f", name: "F" },
          ],
        },
      },
    ]
    expect(extractProducts(trace, "en")).toHaveLength(4)
  })

  it("extracts product cards from a compareProducts result", () => {
    const trace: ToolTrace[] = [
      {
        id: "1",
        name: "compareProducts",
        args: {},
        result: {
          products: [
            { slug: "bpc-157", name: "BPC-157", fromPriceCents: 3990 },
            { slug: "ghk-cu", name: "GHK-Cu", fromPriceCents: 2990 },
          ],
        },
      },
    ]
    const cards = extractProducts(trace, "en")
    expect(cards.map((c) => c.slug)).toEqual(["bpc-157", "ghk-cu"])
  })

  it("ignores tools that don't carry product data", () => {
    const trace: ToolTrace[] = [
      { id: "1", name: "viewCart", args: {}, result: { count: 0 } },
      { id: "2", name: "addToCart", args: {}, result: { ok: true } },
    ]
    expect(extractProducts(trace, "en")).toEqual([])
  })

  it("ignores tool results that are missing required fields", () => {
    const trace: ToolTrace[] = [
      {
        id: "1",
        name: "searchProducts",
        args: {},
        result: {
          results: [
            { slug: "no-name" }, // missing name
            { name: "no-slug" }, // missing slug
            { slug: "ok", name: "OK", url: "/en/shop/ok" },
          ],
        },
      },
    ]
    const cards = extractProducts(trace, "en")
    expect(cards).toHaveLength(1)
    expect(cards[0]?.slug).toBe("ok")
  })
})

describe("InlineProducts — render", () => {
  const messages = {
    averia: {
      actions: {},
      feedback: { helpful: "Helpful", notHelpful: "Not helpful" },
    },
  }

  it("renders nothing when given an empty list", () => {
    const out = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages}>
        <InlineProducts products={[]} />
      </NextIntlClientProvider>,
    )
    expect(out).toMatch(/^<ul[^>]*>\s*<\/ul>$/)
  })

  it("renders a link card for each product with its name and price", () => {
    const out = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages}>
        <InlineProducts
          products={[
            {
              slug: "bpc-157",
              name: "BPC-157",
              url: "/en/shop/bpc-157",
              purityPercent: 99.2,
              fromPriceCents: 3990,
            },
          ]}
        />
      </NextIntlClientProvider>,
    )
    expect(out).toContain('href="/en/shop/bpc-157"')
    expect(out).toContain("BPC-157")
    expect(out).toContain("99.2% HPLC")
  })
})
