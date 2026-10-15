import {
  BreadcrumbJsonLd,
  DiscussionForumPostingJsonLd,
  GlossaryTermJsonLd,
  ItemListJsonLd,
  JsonLd,
  OrganizationJsonLd,
  WebsiteJsonLd,
} from "@/components/seo/JsonLd"
import React, { createElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

beforeEach(() => vi.stubGlobal("React", React))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function renderedSchemas(elements: ReactElement[]) {
  const html = renderToStaticMarkup(createElement(React.Fragment, null, ...elements))
  return [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((match) => {
    if (!match[1]) throw new Error("Expected rendered JSON-LD script contents")
    return JSON.parse(match[1])
  })
}

for (const review of [true, false]) {
  for (const locale of ["en", "fi"]) {
    it(`${review ? "review" : "merchant"} ${locale}: rendered internal schemas share the configured origin and locale`, () => {
      const reviewOrigin = "https://averianlabs-demo.netlify.app"
      const merchantOrigin = "https://merchant.example"
      const origin = review ? reviewOrigin : merchantOrigin
      vi.stubEnv("NEXT_PUBLIC_REVIEW_SITE", String(review))
      vi.stubEnv("BUILD_MODE", "")
      vi.stubEnv("URL", reviewOrigin)
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", merchantOrigin)
      const legacy = "https://averianlabs.eu"
      const schemas = renderedSchemas([
        createElement(OrganizationJsonLd, { key: "organization" }),
        createElement(WebsiteJsonLd, { locale }),
        createElement(BreadcrumbJsonLd, {
          items: [
            { name: "Catalogue", href: `/${locale}/shop` },
            { name: "Exact variant", href: `${legacy}/${locale}/shop/example?sku=EX-10#records` },
          ],
        }),
        createElement(GlossaryTermJsonLd, {
          term: "Example term",
          shortDefinition: "An illustrative definition.",
          url: `${legacy}/${locale}/glossary/example`,
          locale,
        }),
        createElement(DiscussionForumPostingJsonLd, {
          title: "Illustrative discussion",
          url: `${legacy}/${locale}/community/thread/example`,
          datePublished: "2026-10-15T00:00:00.000Z",
          authorName: "Example member",
          commentCount: 2,
          locale,
        }),
        createElement(ItemListJsonLd, {
          name: "Illustrative list",
          url: `${legacy}/${locale}/plans/example`,
          items: [
            { name: "Example product", url: `${legacy}/${locale}/shop/example`, position: 1 },
          ],
          locale,
        }),
      ])
      expect(schemas).toEqual([
        expect.objectContaining({ "@type": "Organization", url: origin }),
        expect.objectContaining({
          "@type": "WebSite",
          url: origin,
          potentialAction: expect.objectContaining({
            target: expect.objectContaining({
              urlTemplate: `${origin}/${locale}/shop?q={search_term_string}`,
            }),
          }),
        }),
        expect.objectContaining({
          "@type": "BreadcrumbList",
          itemListElement: [
            expect.objectContaining({ item: `${origin}/${locale}/shop` }),
            expect.objectContaining({ item: `${origin}/${locale}/shop/example?sku=EX-10#records` }),
          ],
        }),
        expect.objectContaining({
          "@type": "DefinedTerm",
          url: `${origin}/${locale}/glossary/example`,
          inDefinedTermSet: expect.objectContaining({ url: `${origin}/${locale}/glossary` }),
        }),
        expect.objectContaining({
          "@type": "DiscussionForumPosting",
          url: `${origin}/${locale}/community/thread/example`,
          isPartOf: expect.objectContaining({ url: `${origin}/${locale}` }),
        }),
        expect.objectContaining({
          "@type": "ItemList",
          url: `${origin}/${locale}/plans/example`,
          itemListElement: [expect.objectContaining({ url: `${origin}/${locale}/shop/example` })],
          isPartOf: expect.objectContaining({ url: `${origin}/${locale}` }),
        }),
      ])
    })
  }
}

it("keeps the English search default for existing callers that omit locale", () => {
  vi.stubEnv("NEXT_PUBLIC_REVIEW_SITE", "true")
  vi.stubEnv("URL", "https://averianlabs-demo.netlify.app")
  expect(renderedSchemas([createElement(WebsiteJsonLd, { key: "website" })])).toEqual([
    expect.objectContaining({
      potentialAction: expect.objectContaining({
        target: expect.objectContaining({
          urlTemplate: "https://averianlabs-demo.netlify.app/en/shop?q={search_term_string}",
        }),
      }),
    }),
  ])
})

it("keeps user-controlled text inside one parseable script", () => {
  const text = "</script><script>example</script>"
  const html = renderToStaticMarkup(createElement(JsonLd, { data: { description: text } }))
  expect(html.match(/<script/g)).toHaveLength(1)
  expect(renderedSchemas([createElement(JsonLd, { data: { description: text } })])).toEqual([
    { description: text },
  ])
})
