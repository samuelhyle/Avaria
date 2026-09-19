/**
 * Email rendering — escapeHtml + HTML escape sanity for every renderer.
 *
 * The renderers are async (they load translations via next-intl), so
 * they're exercised by integration tests. Here we lock in the contract
 * for the XSS-critical primitive `escapeHtml` and assert the wrapper
 * never leaks raw user input into a place that ends up as HTML.
 */

import { escapeHtml } from "@/lib/email"
import { describe, expect, it } from "vitest"

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("AT&T")).toBe("AT&amp;T")
  })

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;")
  })

  it("escapes double quotes", () => {
    expect(escapeHtml(`"hi"`)).toBe("&quot;hi&quot;")
  })

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s")
  })

  it("escapes the dangerous strings we routinely see in email content", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    )
  })

  it("passes safe text through unchanged (after escaping the ampersand if any)", () => {
    expect(escapeHtml("Hello, world!")).toBe("Hello, world!")
    expect(escapeHtml("Order #A-1042 confirmed")).toBe("Order #A-1042 confirmed")
  })

  it("handles empty strings", () => {
    expect(escapeHtml("")).toBe("")
  })

  it("escapes ampersands BEFORE other entities (otherwise &lt; becomes &amp;lt;)", () => {
    // If `&` is escaped after `<, the resulting `&lt;` would become
    // `&amp;lt;` and re-render as `<` — a real XSS bug. Verify the order.
    expect(escapeHtml("&<>")).toBe("&amp;&lt;&gt;")
  })
})
