import { isPublishableFigure } from "@/components/media/ScientificFigure"
import { describe, expect, it } from "vitest"

describe("scientific figure publication", () => {
  const reviewed = {
    reviewed: true,
    alt: "Two labelled concentration curves",
    caption: "An explanatory comparison, not a product result.",
    credit: "Original illustration",
    rights: "Owned artwork",
    sourceUrl: "https://example.com/asset-record",
    asset: { url: "https://cdn.sanity.io/figure.png" },
  }
  it("requires reviewed, attributed and accessible content", () => {
    expect(isPublishableFigure(reviewed)).toBe(true)
    expect(isPublishableFigure({ ...reviewed, reviewed: false })).toBe(false)
    expect(isPublishableFigure({ ...reviewed, alt: "" })).toBe(false)
    expect(isPublishableFigure({ ...reviewed, rights: "" })).toBe(false)
    expect(isPublishableFigure({ ...reviewed, sourceUrl: "javascript:alert(1)" })).toBe(false)
  })
  it("permits deliberately decorative figures with provenance and an empty alternative", () => {
    expect(isPublishableFigure({ ...reviewed, decorative: true, alt: "" })).toBe(true)
  })
})
