import { describe, expect, it } from "vitest"
import { type ReputationTier, TIERS, nextTier, progressToNext, tierFor } from "./reputation"

describe("tierFor", () => {
  it.each([
    [0, "new"],
    [4, "new"],
    [5, "contributor"],
    [24, "contributor"],
    [25, "analyst"],
    [99, "analyst"],
    [100, "senior"],
    [249, "senior"],
    [250, "fellow"],
    [10000, "fellow"],
  ])("reputation %i maps to tier %s", (rep, expected) => {
    expect(tierFor(rep).id).toBe(expected)
  })

  it("falls back to new tier on negative input (defensive)", () => {
    expect(tierFor(-100).id).toBe("new")
  })
})

describe("nextTier", () => {
  it.each([
    [0, "contributor"],
    [4, "contributor"],
    [5, "analyst"],
    [24, "analyst"],
    [25, "senior"],
    [99, "senior"],
    [100, "fellow"],
    [249, "fellow"],
    [250, null],
    [10000, null],
  ])("reputation %i has next tier %s", (rep, expected) => {
    const result = nextTier(rep)
    expect(result?.id ?? null).toBe(expected)
  })
})

describe("progressToNext", () => {
  it("returns null at top tier", () => {
    expect(progressToNext(250)).toBeNull()
    expect(progressToNext(9999)).toBeNull()
  })

  it("returns a progress object within a tier", () => {
    const p = progressToNext(10)
    expect(p).not.toBeNull()
    // 10 reputation: contributor tier (min=5), next tier analyst (min=25), span = 20, within = 5
    expect(p?.current).toBe(5)
    expect(p?.target).toBe(20)
  })

  it("clamps pct to 0–100", () => {
    const p = progressToNext(0)
    expect(p?.pct).toBe(0)
  })
})

describe("TIERS constant", () => {
  it("has 5 tiers in correct order", () => {
    expect(TIERS.map((t) => t.id)).toEqual(["new", "contributor", "analyst", "senior", "fellow"])
  })

  it("every tier has a numeric min that's strictly increasing", () => {
    for (let i = 1; i < TIERS.length; i++) {
      const prev = TIERS[i - 1]!
      const curr = TIERS[i]!
      expect(curr.min).toBeGreaterThan(prev.min)
    }
  })

  it("every tier id is a valid ReputationTier", () => {
    const validIds: ReputationTier[] = ["new", "contributor", "analyst", "senior", "fellow"]
    for (const t of TIERS) {
      expect(validIds).toContain(t.id)
    }
  })
})
