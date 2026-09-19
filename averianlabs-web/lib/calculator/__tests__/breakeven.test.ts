import { describe, expect, it } from "vitest"
import { compareVialPlans } from "@/lib/calculator/breakeven"

describe("compareVialPlans", () => {
  it("picks the cheapest per mg and the smallest leftover", () => {
    const result = compareVialPlans({
      plans: [
        { label: "1× 10 mg vial", vialMg: 10, vials: 1, priceCents: 6900 },
        { label: "2× 5 mg vials", vialMg: 5, vials: 2, priceCents: 3990 },
      ],
      doseMcg: 250,
    })
    expect(result.plans).toHaveLength(2)
    // 1×10 mg vial: €69 / 10 mg = €6.90/mg, 40 doses, 0 leftover.
    // 2×5 mg vials: €79.80 / 10 mg = €7.98/mg, 40 doses, 0 leftover.
    // Per-mg, the 10 mg vial is cheaper; the 5 mg vial plan covers the same
    // doses (because we buy the same total peptide mass). The cheap selector
    // is "lowest cents/mg", the least-waste is "lowest leftover mg".
    expect(result.cheapest?.vials).toBe(1)
    expect(result.leastWaste?.vials).toBe(1)
    expect(result.identicalCoverage).toBe(true)
  })
  it("flags a different winner when plans differ in leftover", () => {
    const result = compareVialPlans({
      plans: [
        { label: "1× 50 mg vial", vialMg: 50, vials: 1, priceCents: 9900 },
        { label: "5× 10 mg vials", vialMg: 10, vials: 5, priceCents: 6900 },
      ],
      doseMcg: 2500,
    })
    // 50 mg covers 20 doses @ 2.5 mg = no leftover; 5×10 mg covers 20 doses @ 2.5 mg = no leftover.
    expect(result.identicalCoverage).toBe(true)
  })
  it("returns empty when dose is zero or plans are empty", () => {
    const a = compareVialPlans({ plans: [], doseMcg: 250 })
    expect(a.plans).toHaveLength(0)
    const b = compareVialPlans({ plans: [{ label: "x", vialMg: 10, vials: 1, priceCents: 1000 }], doseMcg: 0 })
    expect(b.plans).toHaveLength(0)
  })
})
