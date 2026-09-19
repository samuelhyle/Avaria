/**
 * `ToolTraceList` — the chip strip of tool calls a model made for a reply.
 *
 * Each tool renders as a pill with its icon and name; tools with a
 * result show a `·` separator, tools still streaming show an animated
 * ellipsis. We lock in both shapes here.
 */

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ToolIcon, ToolTraceList } from "@/components/ai/chat/ToolTraceList"
import type { ToolTrace } from "@/components/ai/chat/types"

describe("ToolTraceList", () => {
  it("renders a pill per tool call with its name", () => {
    const trace: ToolTrace[] = [
      { id: "1", name: "searchProducts", args: { q: "bpc-157" }, result: { hits: [] } },
      { id: "2", name: "getProduct", args: { slug: "bpc-157" }, result: { sku: "BPC-157" } },
    ]
    const html = renderToStaticMarkup(<ToolTraceList trace={trace} />)
    expect(html).toContain("searchProducts")
    expect(html).toContain("getProduct")
  })

  it("shows the '·' separator for tools with a result", () => {
    const trace: ToolTrace[] = [{ id: "1", name: "searchProducts", args: {}, result: {} }]
    const html = renderToStaticMarkup(<ToolTraceList trace={trace} />)
    expect(html).toContain("·")
    // The result class should be applied (border-line + bg-surface-2).
    expect(html).toContain("bg-surface-2")
  })

  it("shows the animated ellipsis for tools still streaming", () => {
    const trace: ToolTrace[] = [{ id: "1", name: "searchProducts", args: {} }]
    const html = renderToStaticMarkup(<ToolTraceList trace={trace} />)
    expect(html).toContain("animate-pulse")
    expect(html).toContain("…")
  })

  it("renders nothing when the trace is empty", () => {
    const html = renderToStaticMarkup(<ToolTraceList trace={[]} />)
    // Just an empty ul.
    expect(html).toMatch(/^<ul[^>]*>\s*<\/ul>$/)
  })

  it("marks the ul aria-live so screen readers announce new tool calls", () => {
    const html = renderToStaticMarkup(<ToolTraceList trace={[]} />)
    expect(html).toContain('aria-live="polite"')
  })

  it("uses the result colour class when the tool has completed", () => {
    const completed: ToolTrace[] = [{ id: "1", name: "getProduct", args: {}, result: { sku: "x" } }]
    const pending: ToolTrace[] = [{ id: "1", name: "getProduct", args: {} }]
    expect(renderToStaticMarkup(<ToolTraceList trace={completed} />)).toContain("bg-surface-2")
    expect(renderToStaticMarkup(<ToolTraceList trace={pending} />)).toContain("bg-accent/5")
  })
})

describe("ToolIcon", () => {
  it("falls back to a generic beaker icon for unknown tools", () => {
    const html = renderToStaticMarkup(<ToolIcon name="totally-unknown-tool" />)
    expect(html).toContain("<svg")
  })

  it("renders a known tool's icon", () => {
    const html = renderToStaticMarkup(<ToolIcon name="searchProducts" />)
    // Lucide icons render as inline svg; just assert the SVG node is present.
    expect(html).toContain("<svg")
  })
})
