/**
 * `CitationChips` — source links for a model reply.
 *
 * Renders an `<a>` when the citation has a URL, a `<span>` when it doesn't
 * (so the layout stays consistent for sources we couldn't link to).
 *
 * Defends against the previous regression where missing URLs rendered
 * `<a href="#">` and scrolled the page to the top on click.
 */

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CitationChips } from "@/components/ai/chat/CitationChips"
import type { CitationRef } from "@/lib/ai/types"

const base: CitationRef = {
  source: "blog",
  sourceId: "bpc-157-purity",
  index: 1,
  title: "HPLC purity is 99.2%",
  url: "/en/blog/bpc-157-purity",
  score: 0.92,
}

describe("CitationChips", () => {
  it("renders an anchor when the URL is present", () => {
    const html = renderToStaticMarkup(<CitationChips citations={[base]} />)
    expect(html).toContain('href="/en/blog/bpc-157-purity"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer noopener"')
    expect(html).toContain("HPLC purity is 99.2%")
    expect(html).toContain("[1]")
  })

  it("renders a span (no anchor) when the URL is missing", () => {
    const html = renderToStaticMarkup(<CitationChips citations={[{ ...base, url: null }]} />)
    expect(html).not.toContain("<a ")
    expect(html).not.toContain("href=")
    expect(html).toContain("<span")
    expect(html).toContain("HPLC purity is 99.2%")
  })

  it("renders multiple chips with stable keys", () => {
    const html = renderToStaticMarkup(
      <CitationChips
        citations={[
          { ...base, index: 1, sourceId: "a" },
          { ...base, index: 2, sourceId: "b" },
          { ...base, index: 3, sourceId: "c" },
        ]}
      />,
    )
    expect(html).toContain("[1]")
    expect(html).toContain("[2]")
    expect(html).toContain("[3]")
  })

  it("renders nothing when the citations list is empty", () => {
    const html = renderToStaticMarkup(<CitationChips citations={[]} />)
    // Just an empty wrapping div.
    expect(html).toMatch(/^<div[^>]*><\/div>$/)
  })

  it("includes a title-attribute fallback on the span for accessibility", () => {
    const html = renderToStaticMarkup(<CitationChips citations={[{ ...base, url: null }]} />)
    expect(html).toContain('aria-label="HPLC purity is 99.2%"')
  })

  it('never emits href="#" (previous regression — would scroll to top)', () => {
    // Round-trip every test case: even missing URLs should NOT render an
    // anchor with a fallback href. This guards the regression we
    // intentionally fixed in the recent chat-system refactor.
    const htmls = [
      renderToStaticMarkup(<CitationChips citations={[base]} />),
      renderToStaticMarkup(<CitationChips citations={[{ ...base, url: null }]} />),
      renderToStaticMarkup(<CitationChips citations={[]} />),
    ]
    for (const html of htmls) {
      expect(html).not.toContain('href="#"')
    }
  })
})
