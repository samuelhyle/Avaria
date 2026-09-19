/**
 * `AssistantMarkdown` — the streaming markdown renderer.
 *
 * Two render modes:
 *   - `isStreaming=false`: render the full content through `react-markdown`.
 *   - `isStreaming=true`: split into a "committed" prefix (rendered as
 *     Markdown) and a "trailing" tail (rendered as plain pre-wrapped text
 *     + a blinking caret).
 *
 * The split is done by `lib/ai/streaming/markdown-split.ts` — here we
 * verify the component renders both branches without crashing.
 */

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AssistantMarkdown } from "@/components/ai/chat/AssistantMarkdown"

describe("AssistantMarkdown — idle render", () => {
  it("renders plain markdown as a paragraph", () => {
    const out = renderToStaticMarkup(
      <AssistantMarkdown content="Hello **world**." isStreaming={false} />,
    )
    expect(out).toContain("<p")
    expect(out).toContain("Hello")
    expect(out).toContain("<strong>world</strong>")
    expect(out).toContain(".")
  })

  it("renders GFM tables when not streaming", () => {
    const out = renderToStaticMarkup(
      <AssistantMarkdown
        content={"| Purity | Vial |\n| --- | --- |\n| 99.2% | 5mg |\n| 99.4% | 10mg |"}
        isStreaming={false}
      />,
    )
    expect(out).toContain("<table")
    expect(out).toContain("<th")
    expect(out).toContain("<td")
  })

  it("does NOT append the streaming caret when not streaming", () => {
    const out = renderToStaticMarkup(<AssistantMarkdown content="Hello" isStreaming={false} />)
    expect(out).not.toContain("animate-pulse")
  })
})

describe("AssistantMarkdown — streaming render", () => {
  it("renders the leading committed prefix as markdown and the trailing tail as plain text", () => {
    const out = renderToStaticMarkup(
      <AssistantMarkdown
        content={"First paragraph.\n\nSecond partial sentence"}
        isStreaming={true}
      />,
    )
    // The first paragraph (closed by the double newline) is committed
    // and rendered as <p>; the partial tail is rendered as plain text.
    expect(out).toContain("<p")
    expect(out).toContain("First paragraph.")
    expect(out).toContain("Second partial sentence")
  })

  it("appends the streaming caret while streaming", () => {
    const out = renderToStaticMarkup(<AssistantMarkdown content="Hello" isStreaming={true} />)
    expect(out).toContain("animate-pulse")
  })

  it("renders an empty string gracefully (no crash, no caret)", () => {
    const out = renderToStaticMarkup(<AssistantMarkdown content="" isStreaming={true} />)
    expect(out).not.toContain("animate-pulse")
  })

  it("handles a complete doc in streaming mode without losing content", () => {
    const content = "# Heading\n\nAll done.\n"
    const out = renderToStaticMarkup(<AssistantMarkdown content={content} isStreaming={true} />)
    expect(out).toContain("Heading")
    expect(out).toContain("All done.")
  })
})
