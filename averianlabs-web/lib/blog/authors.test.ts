import { describe, expect, it } from "vitest"
import { SEED_AUTHORS } from "./authors"

describe("SEED_AUTHORS", () => {
  it("has at least 2 seed authors for dev", () => {
    expect(SEED_AUTHORS.length).toBeGreaterThanOrEqual(2)
  })

  it("every seed has a unique slug", () => {
    const slugs = SEED_AUTHORS.map((a) => a.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("every seed has a non-empty name, role, bio, and id", () => {
    for (const a of SEED_AUTHORS) {
      expect(a.id.length).toBeGreaterThan(0)
      expect(a.name.length).toBeGreaterThan(0)
      expect(a.role.length).toBeGreaterThan(0)
      expect(a.bio.length).toBeGreaterThan(0)
    }
  })
})
