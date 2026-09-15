import { describe, expect, it } from "vitest"
import { type ActivityKind, VALID_KINDS } from "./emit"

describe("VALID_KINDS", () => {
  it("contains the 7 documented activity kinds", () => {
    const expected: ActivityKind[] = [
      "thread_created",
      "post_created",
      "reaction_added",
      "batch_status_changed",
      "product_status_published",
      "research_note_published",
      "plan_shared",
    ]
    for (const k of expected) {
      expect(VALID_KINDS.has(k)).toBe(true)
    }
  })

  it("has no surprise additions", () => {
    expect(VALID_KINDS.size).toBe(7)
  })

  it("rejects unknown kinds (defensive — guarded at insert)", () => {
    expect(VALID_KINDS.has("login" as ActivityKind)).toBe(false)
    expect(VALID_KINDS.has("" as ActivityKind)).toBe(false)
  })
})
