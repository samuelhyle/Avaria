import { splitMarkdownForStreaming } from "@/lib/ai/streaming/markdown-split"
import { describe, expect, it } from "vitest"

describe("splitMarkdownForStreaming", () => {
  it("returns everything as trailing when there is no double newline yet", () => {
    const out = splitMarkdownForStreaming("Hello world")
    expect(out.committed).toBe("")
    expect(out.trailing).toBe("Hello world")
  })

  it("splits at the last safe double newline", () => {
    const out = splitMarkdownForStreaming("First paragraph.\n\nSecond still typing")
    expect(out.committed).toBe("First paragraph.\n\n")
    expect(out.trailing).toBe("Second still typing")
  })

  it("advances the split as the trailing text completes", () => {
    const a = splitMarkdownForStreaming("Hello.\n\nWor")
    const b = splitMarkdownForStreaming("Hello.\n\nWorld")
    expect(a.trailing).toBe("Wor")
    expect(b.committed).toBe("Hello.\n\n")
    expect(b.trailing).toBe("World")
  })

  it("promotes the trailing block once it ends in a double newline", () => {
    const out = splitMarkdownForStreaming("Hello.\n\nWorld.\n\n")
    expect(out.committed).toBe("Hello.\n\nWorld.\n\n")
    expect(out.trailing).toBe("")
  })

  it("does not split inside an open fenced code block", () => {
    const content = "Before.\n\n```python\ndef f(  # still typing"
    const out = splitMarkdownForStreaming(content)
    expect(out.committed).toBe("Before.\n\n")
    expect(out.trailing).toBe("```python\ndef f(  # still typing")
  })

  it("splits again after a code fence closes", () => {
    const content = "Before.\n\n```python\npass\n```\n\nAfter."
    const out = splitMarkdownForStreaming(content)
    expect(out.committed).toBe("Before.\n\n```python\npass\n```\n\n")
    expect(out.trailing).toBe("After.")
  })

  it("handles a backtick fence that is not on its own line", () => {
    // Inline code like `x = 1` should not toggle the fence state.
    const content = "Use `x = 1` then\n\nContinue."
    const out = splitMarkdownForStreaming(content)
    expect(out.committed).toBe("Use `x = 1` then\n\n")
    expect(out.trailing).toBe("Continue.")
  })

  it("keeps a half-typed table as trailing text", () => {
    const content = "Intro.\n\n| Col A | Col"
    const out = splitMarkdownForStreaming(content)
    expect(out.committed).toBe("Intro.\n\n")
    expect(out.trailing).toBe("| Col A | Col")
  })

  it("treats empty content as fully trailing", () => {
    const out = splitMarkdownForStreaming("")
    expect(out.committed).toBe("")
    expect(out.trailing).toBe("")
  })

  it("handles content that starts at the line boundary with a fence", () => {
    const content = "```\ncode\n```\n\nTail."
    const out = splitMarkdownForStreaming(content)
    expect(out.committed).toBe("```\ncode\n```\n\n")
    expect(out.trailing).toBe("Tail.")
  })
})
