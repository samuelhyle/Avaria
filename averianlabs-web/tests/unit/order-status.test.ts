import {
  CLOSED_STATUSES,
  FULFILLED_STATUSES,
  HOLDING_STATUSES,
  INVALID_ORDER_TRANSITIONS,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  type OrderStatus,
  canTransition,
  isOrderStatus,
} from "@/lib/orders/status"
import { describe, expect, it } from "vitest"

/**
 * The order status machine.
 *
 * The transition table is the single authority on which state moves are legal.
 * A move that is not in the table is refused, so the table is worth testing
 * exhaustively rather than by example: a wrong entry either blocks a
 * fulfilment or lets a refunded order be shipped.
 */

describe("order status machine", () => {
  it("knows every status", () => {
    for (const status of ORDER_STATUSES) expect(isOrderStatus(status)).toBe(true)
    expect(isOrderStatus("nonsense")).toBe(false)
    expect(isOrderStatus("")).toBe(false)
  })

  it("allows a paid order to progress to delivery", () => {
    expect(canTransition("paid", "packed")).toBe(true)
    expect(canTransition("paid", "shipped")).toBe(true)
    expect(canTransition("paid", "delivered")).toBe(true)
    expect(canTransition("packed", "shipped")).toBe(true)
    expect(canTransition("shipped", "delivered")).toBe(true)
  })

  it("never lets a refund be undone", () => {
    for (const status of ORDER_STATUSES) expect(canTransition("refunded", status)).toBe(false)
  })

  it("never lets a failed or expired order move on its own", () => {
    // A late payment re-opens them, and nothing else does.
    expect(canTransition("failed", "paid")).toBe(true)
    expect(canTransition("failed", "payment_review")).toBe(true)
    expect(canTransition("expired", "paid")).toBe(true)
    expect(canTransition("expired", "payment_review")).toBe(true)
    expect(canTransition("failed", "shipped")).toBe(false)
    expect(canTransition("expired", "delivered")).toBe(false)
    expect(canTransition("failed", "packed")).toBe(false)
  })

  it("never lets an unpaid order be dispatched", () => {
    expect(canTransition("pending", "packed")).toBe(false)
    expect(canTransition("pending", "shipped")).toBe(false)
    expect(canTransition("pending", "delivered")).toBe(false)
    expect(canTransition("awaiting_crypto", "shipped")).toBe(false)
    expect(canTransition("awaiting_crypto", "delivered")).toBe(false)
  })

  it("never skips the fulfilment steps backwards", () => {
    expect(canTransition("shipped", "paid")).toBe(false)
    expect(canTransition("shipped", "packed")).toBe(false)
    expect(canTransition("delivered", "shipped")).toBe(false)
    expect(canTransition("delivered", "paid")).toBe(false)
  })

  it("treats every transition as a decision about the whole table", () => {
    // Every status must appear in the table, and every target of a transition
    // must itself be a known status.
    for (const status of ORDER_STATUSES) {
      expect(ORDER_TRANSITIONS[status]).toBeDefined()
      for (const target of ORDER_TRANSITIONS[status]) {
        expect(isOrderStatus(target)).toBe(true)
        expect(ORDER_TRANSITIONS[status]).toContain(target)
      }
    }
  })

  it("has no transition that points at itself", () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_TRANSITIONS[status]).not.toContain(status)
    }
  })

  it("never points a refunded order at another state", () => {
    // A refund is final. A failed or expired order is not — a late payment
    // re-opens it — so those two are closed for the customer but not for the
    // system.
    expect(ORDER_TRANSITIONS.refunded).toHaveLength(0)
    for (const status of CLOSED_STATUSES) {
      if (status === "refunded") continue
      for (const target of ORDER_TRANSITIONS[status]) {
        expect(["paid", "payment_review", "refunded"]).toContain(target)
      }
    }
  })

  it("classifies the states that hold stock and the states that are fulfilled", () => {
    expect(HOLDING_STATUSES).toContain("pending")
    expect(HOLDING_STATUSES).toContain("awaiting_crypto")
    expect(FULFILLED_STATUSES).toContain("paid")
    expect(FULFILLED_STATUSES).toContain("shipped")
    // A refunded order was paid once, so it is not "awaiting fulfilment".
    expect(FULFILLED_STATUSES as readonly string[]).not.toContain("refunded")
  })

  it("refuses a transition from an unknown state", () => {
    expect(canTransition("not-a-status", "paid")).toBe(false)
    expect(canTransition("", "paid")).toBe(false)
  })

  it("exports the invalid transitions it must never allow", () => {
    for (const pair of INVALID_ORDER_TRANSITIONS) {
      const [from, to] = pair
      expect(canTransition(from, to)).toBe(false)
    }
  })

  it("keeps every status a string union member", () => {
    const status: OrderStatus = "awaiting_crypto"
    expect(ORDER_STATUSES).toContain(status)
  })
})
