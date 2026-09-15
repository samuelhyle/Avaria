import { describe, expect, it } from "vitest"
import { CATEGORY_SEEDS } from "./categories"

describe("CATEGORY_SEEDS", () => {
  it("has exactly 7 seeds (matches the v1 proven structure)", () => {
    expect(CATEGORY_SEEDS).toHaveLength(7)
  })

  it("every seed has a unique slug", () => {
    const slugs = CATEGORY_SEEDS.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("every seed has a unique sortOrder", () => {
    const orders = CATEGORY_SEEDS.map((s) => s.sortOrder)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it("every nameKey + descriptionKey points to the community namespace", () => {
    for (const s of CATEGORY_SEEDS) {
      expect(s.nameKey).toMatch(/^community\.categories\.[a-zA-Z]+\.name$/)
      expect(s.descriptionKey).toMatch(/^community\.categories\.[a-zA-Z]+\.description$/)
    }
  })

  it("includes the expected canonical slugs", () => {
    const slugs = CATEGORY_SEEDS.map((s) => s.slug)
    expect(slugs).toEqual(
      expect.arrayContaining([
        "announcements",
        "research-discussion",
        "documentation-coa",
        "methods-analysis",
        "storage-handling",
        "market-compliance",
        "off-topic-lounge",
      ]),
    )
  })
})
