import { describe, expect, it } from "vitest"
import {
  formatShelfLife,
  getStabilityFor,
  recommendStorage,
} from "@/lib/calculator/stability"

describe("getStabilityFor", () => {
  it("returns profiles for known peptides", () => {
    expect(getStabilityFor("bpc-157").shelfLife.refrigerated_2to8).toBe(14)
    expect(getStabilityFor("ghk-cu").shelfLife.refrigerated_2to8).toBe(7)
  })
  it("falls back gracefully", () => {
    const profile = getStabilityFor(undefined)
    expect(profile.shelfLife.refrigerated_2to8).toBe(7)
  })
})

describe("recommendStorage", () => {
  it("returns a refrigerated-by-default estimate with notes", () => {
    const r = recommendStorage("bpc-157")
    expect(r.recommendedTemp).toBe("refrigerated_2to8")
    expect(r.shelfLifeDays).toBe(14)
  })
})

describe("formatShelfLife", () => {
  it("formats sensible bands", () => {
    expect(formatShelfLife(0)).toBe("—")
    expect(formatShelfLife(5)).toBe("5 days")
    expect(formatShelfLife(14)).toBe("2 weeks")
    expect(formatShelfLife(30)).toMatch(/month/)
    expect(formatShelfLife(60)).toMatch(/month/)
  })
})
