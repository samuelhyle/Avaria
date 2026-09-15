import { describe, expect, it } from "vitest"
import { type Citation, citationHref, parseCitations } from "./index"

describe("parseCitations", () => {
  it("returns cleaned text + empty citations when no markers present", () => {
    const r = parseCitations("Just plain text about HPLC purity.")
    expect(r.cleaned).toBe("Just plain text about HPLC purity.")
    expect(r.citations).toEqual([])
  })

  it("extracts a single field citation", () => {
    const r = parseCitations("BPC-157 [cite:field bpc-157#mechanism] is interesting.")
    expect(r.citations).toHaveLength(1)
    expect(r.citations[0]?.kind).toBe("field")
    if (r.citations[0]?.kind === "field") {
      expect(r.citations[0].label).toBe("bpc-157")
      expect(r.citations[0].anchor).toBe("mechanism")
    }
  })

  it("uses default anchor 'specs' when no #anchor provided", () => {
    const r = parseCitations("See [cite:field bpc-157] for details.")
    expect(r.citations[0]).toMatchObject({
      kind: "field",
      label: "bpc-157",
      anchor: "specs",
    })
  })

  it("extracts doc citations with separate label and id", () => {
    const r = parseCitations("[cite:doc HX-BPC HX-BPC-2026-04]")
    expect(r.citations[0]).toMatchObject({
      kind: "doc",
      label: "HX-BPC",
      documentId: "HX-BPC-2026-04",
    })
  })

  it("falls back to label when doc has no id", () => {
    const r = parseCitations("[cite:doc COA-2026-04]")
    expect(r.citations[0]).toMatchObject({
      kind: "doc",
      label: "COA-2026-04",
      documentId: "COA-2026-04",
    })
  })

  it("extracts market citations", () => {
    const r = parseCitations("[cite:market FI]")
    expect(r.citations[0]).toMatchObject({ kind: "market", marketCode: "FI" })
  })

  it("extracts thread citations", () => {
    const r = parseCitations("[cite:thread bpc-vs-tb-500]")
    expect(r.citations[0]).toMatchObject({
      kind: "thread",
      threadSlug: "bpc-vs-tb-500",
    })
  })

  it("extracts glossary citations", () => {
    const r = parseCitations("[cite:glossary hplc]")
    expect(r.citations[0]).toMatchObject({ kind: "glossary", slug: "hplc" })
  })

  it("dedupes identical citations (same kind + payload)", () => {
    const text = "First [cite:thread same-slug] and again [cite:thread same-slug]"
    const r = parseCitations(text)
    expect(r.citations).toHaveLength(1)
  })

  it("strips multiple distinct citations", () => {
    const text = "See [cite:field a#x] and [cite:thread abc] and [cite:glossary hplc]"
    const r = parseCitations(text)
    expect(r.citations).toHaveLength(3)
  })

  it("preserves non-marker text in cleaned output", () => {
    const r = parseCitations("Before [cite:thread abc] after")
    expect(r.cleaned).toContain("Before")
    expect(r.cleaned).toContain("after")
    expect(r.cleaned).not.toContain("[cite:")
  })

  it("collapses whitespace left by stripped markers", () => {
    const r = parseCitations("a [cite:thread abc] b")
    expect(r.cleaned).toBe("a b")
  })
})

describe("citationHref", () => {
  const locale = "en"

  it("routes field citations to the product page with anchor", () => {
    const c: Citation = { kind: "field", label: "bpc-157", anchor: "specs" }
    expect(citationHref(c, locale)).toBe("/en/shop/bpc-157#specs")
  })

  it("routes doc citations to the document viewer", () => {
    const c: Citation = { kind: "doc", label: "X", documentId: "HX-2026" }
    expect(citationHref(c, locale)).toBe("/en/documents/HX-2026")
  })

  it("routes market citations to the lab-tests page", () => {
    const c: Citation = { kind: "market", label: "FI", marketCode: "FI" }
    expect(citationHref(c, locale)).toBe("/en/lab-tests?market=FI")
  })

  it("routes thread citations to the community thread", () => {
    const c: Citation = { kind: "thread", label: "x", threadSlug: "bpc-vs-tb" }
    expect(citationHref(c, locale)).toBe("/en/community/thread/bpc-vs-tb")
  })

  it("routes glossary citations to the glossary term", () => {
    const c: Citation = { kind: "glossary", label: "x", slug: "hplc" }
    expect(citationHref(c, locale)).toBe("/en/glossary/hplc")
  })
})
