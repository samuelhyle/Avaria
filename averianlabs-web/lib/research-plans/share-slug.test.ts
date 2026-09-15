import { describe, expect, it } from "vitest"
import { generateShareSlug } from "./share-slug"

describe("generateShareSlug", () => {
  it("produces a non-empty slug", () => {
    const s = generateShareSlug()
    expect(s.length).toBeGreaterThan(0)
  })

  it("produces a URL-safe slug (only - and _ and alphanumeric)", () => {
    for (let i = 0; i < 20; i++) {
      const s = generateShareSlug()
      expect(s).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it("does not contain URL-unsafe characters", () => {
    for (let i = 0; i < 50; i++) {
      const s = generateShareSlug()
      expect(s).not.toMatch(/[+/=]/) // base64 padding/url-unsafe
      expect(s).not.toMatch(/\s/)
    }
  })

  it("produces different slugs on each call (collision resistance)", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      seen.add(generateShareSlug())
    }
    expect(seen.size).toBeGreaterThan(95)
  })

  it("produces slugs of consistent length (9 bytes base64url → 12 chars)", () => {
    for (let i = 0; i < 10; i++) {
      const s = generateShareSlug()
      // base64url(9 bytes) = ceil(9/3)*4 = 12 chars, no padding
      expect(s.length).toBe(12)
    }
  })
})
