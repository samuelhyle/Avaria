/**
 * Agent event type helpers — `proposedActionKey` regression tests.
 *
 * The function produces the stable key used by the client hook to track
 * which proposed-action card was resolved (added/dismissed). It must be
 * stable across renders and unique per action shape — otherwise the
 * resolved-state map can collide between add/remove pairs.
 */

import { type ProposedAction, proposedActionKey } from "@/lib/ai/types/events"
import { describe, expect, it } from "vitest"

describe("proposedActionKey", () => {
  it("keys add_to_cart by SKU", () => {
    const a: ProposedAction = {
      kind: "add_to_cart",
      sku: "BPC-157",
      productSlug: "bpc-157",
      productName: "BPC-157",
      mg: 5,
      qty: 1,
      unitPriceCents: 3990,
    }
    expect(proposedActionKey(a)).toBe("add:BPC-157")
  })

  it("keys remove_from_cart by SKU", () => {
    expect(proposedActionKey({ kind: "remove_from_cart", sku: "BPC-157" })).toBe("remove:BPC-157")
  })

  it("keys remember by key name", () => {
    expect(proposedActionKey({ kind: "remember", key: "preferred_vial", value: "5mg" })).toBe(
      "remember:preferred_vial",
    )
  })

  it("produces different keys for add vs remove on the same SKU", () => {
    const add: ProposedAction = {
      kind: "add_to_cart",
      sku: "BPC-157",
      productSlug: "bpc-157",
      productName: "BPC-157",
      mg: 5,
      qty: 1,
      unitPriceCents: 3990,
    }
    const remove: ProposedAction = { kind: "remove_from_cart", sku: "BPC-157" }
    expect(proposedActionKey(add)).not.toBe(proposedActionKey(remove))
  })
})
