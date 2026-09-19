import { describe, expect, it } from "vitest"
import {
  buildShareUrl,
  decodeState,
  encodeState,
  sanitizeState,
} from "@/lib/calculator/url-state"

const sample = {
  v: 1 as const,
  tab: "dilution" as const,
  vialMg: 10,
  solventMl: 2,
  doseMcg: 50,
  productSlug: "bpc-157",
}

describe("URL state codec", () => {
  it("round-trips arbitrary fields", () => {
    const encoded = encodeState(sample)
    const decoded = decodeState(encoded)
    expect(decoded).toEqual(sample)
  })
  it("returns null for unparseable input", () => {
    expect(decodeState("not-base64!!")).toBeNull()
    expect(decodeState("")).toBeNull()
    expect(decodeState(null)).toBeNull()
  })
  it("rejects unknown versions", () => {
    const encoded = Buffer.from(JSON.stringify({ v: 2, vialMg: 10 })).toString("base64")
    const decoded = decodeState(encoded)
    expect(decoded).toBeNull()
  })
  it("drops keys with invalid values during sanitisation", () => {
    const dirty = {
      v: 1 as const,
      tab: "evil-tab" as unknown as string,
      vialMg: -50,
      solventMl: 10000,
      doseMcg: 200000,
      productSlug: "<script>alert(1)</script>",
      plansJson: "x".repeat(8192),
    }
    const cleaned = sanitizeState(dirty as unknown as Parameters<typeof sanitizeState>[0])
    expect(cleaned.tab).toBeUndefined()
    expect(cleaned.vialMg).toBeUndefined()
    expect(cleaned.productSlug).toBeUndefined()
    expect(cleaned.plansJson).toBeUndefined()
  })
})

describe("buildShareUrl", () => {
  it("builds a relative URL when window is undefined", () => {
    const url = buildShareUrl(sample)
    expect(url.startsWith("?calc=")).toBe(true)
  })
})
