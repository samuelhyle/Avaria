import { prepareAssistantContent } from "@/lib/ai/citations"
import type { CitationRef } from "@/lib/ai/types"
import { describe, expect, it } from "vitest"

const citations: CitationRef[] = [
  {
    source: "blog",
    sourceId: "bpc",
    index: 1,
    title: "BPC-157",
    url: "https://example.com/bpc",
    score: 0.9,
  },
  {
    source: "blog",
    sourceId: "tb500",
    index: 12,
    title: "TB-500",
    url: "https://example.com/tb500",
    score: 0.8,
  },
  {
    source: "blog",
    sourceId: "gip",
    index: 123,
    title: "GIP",
    url: "https://example.com/gip",
    score: 0.7,
  },
]

describe("prepareAssistantContent", () => {
  it("returns the input untouched when there is nothing to do", () => {
    const out = prepareAssistantContent("Hello world.")
    expect(out.text).toBe("Hello world.")
    expect(out.truncatedThink).toBe(false)
  })

  it("strips closed <think> blocks entirely", () => {
    const out = prepareAssistantContent("<think>secret</think>\n\nVisible answer.")
    expect(out.text).not.toContain("secret")
    expect(out.text).toContain("Visible answer.")
    expect(out.truncatedThink).toBe(false)
  })

  it("replaces an unclosed <think> tail with a placeholder", () => {
    const out = prepareAssistantContent("Visible intro.\n\n<think>still typing")
    expect(out.text).toContain("Visible intro.")
    expect(out.text).not.toContain("still typing")
    expect(out.text).toContain("reasoning hidden")
    expect(out.truncatedThink).toBe(true)
  })

  it("handles multiple closed <think> blocks", () => {
    const out = prepareAssistantContent("<think>a</think>One.\n\n<think>b</think>Two.")
    expect(out.text).toContain("One.")
    expect(out.text).toContain("Two.")
    expect(out.text).not.toContain("<think")
  })

  it("strips complete [cite:…] markers", () => {
    const out = prepareAssistantContent("Here is a source [cite:abc-123] for that claim.")
    expect(out.text).not.toContain("[cite:")
    expect(out.text).toContain("for that claim.")
  })

  it("strips truncated [cite:…] left dangling at end-of-stream", () => {
    const out = prepareAssistantContent("A claim. [cite:som")
    expect(out.text).not.toContain("[cite:")
    expect(out.text).toContain("A claim.")
  })

  it("rewrites 1- and 2-digit citation markers to links", () => {
    const out = prepareAssistantContent(
      "BPC-157 is well-known [1] and TB-500 [12] is its cousin.",
      citations,
    )
    expect(out.text).toContain("[1](https://example.com/bpc)")
    expect(out.text).toContain("[12](https://example.com/tb500)")
  })

  it("supports 3+ digit citation indices", () => {
    const out = prepareAssistantContent("See GIP [123] for context.", citations)
    expect(out.text).toContain("[123](https://example.com/gip)")
  })

  it("leaves unknown citation indices intact", () => {
    const out = prepareAssistantContent("Reference [99] exists.", citations)
    expect(out.text).toContain("[99]")
  })

  it("does not double-link citations already rendered as links", () => {
    const out = prepareAssistantContent(
      "See [1](https://other.example/alt) for the alt take.",
      citations,
    )
    expect(out.text).toContain("https://other.example/alt")
    expect(out.text).not.toContain("https://example.com/bpc")
  })

  it("trims leading whitespace and collapses internal double spaces", () => {
    const out = prepareAssistantContent("   Hello  world.   ")
    expect(out.text).toBe("Hello world.")
  })
})
