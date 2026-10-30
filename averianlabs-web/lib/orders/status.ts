/**
 * Order status machine.
 *
 * `lib/orders/service.ts` is the only module that writes `orders.status`, and
 * every write goes through the transitions declared here. The table column is
 * free text, so the states are enforced in code rather than by the database —
 * this file is the single place that defines which moves are legal.
 *
 * States:
 *   pending          — order created, inventory held, awaiting payment
 *   awaiting_crypto  — invoice issued, awaiting an on-chain transfer
 *   paid             — money received, inventory committed
 *   packed           — goods picked and packed, awaiting carrier handover
 *   shipped          — handed to the carrier, tracking recorded
 *   delivered        — carrier reported delivery
 *   failed           — payment attempt failed, hold released
 *   expired          — the payment window closed, hold released
 *   payment_review   — money arrived but the inventory could not be reacquired
 *   refunded         — money returned
 */
export const ORDER_STATUSES = [
  "pending",
  "awaiting_crypto",
  "paid",
  "packed",
  "shipped",
  "delivered",
  "failed",
  "expired",
  "payment_review",
  "refunded",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * Legal transitions. Anything not listed here is refused, so a stray update can
 * never move an order backwards or skip a step.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "awaiting_crypto", "failed", "expired", "payment_review"],
  awaiting_crypto: ["paid", "failed", "expired", "payment_review"],
  paid: ["packed", "shipped", "delivered", "payment_review", "refunded"],
  packed: ["shipped", "delivered", "payment_review", "refunded"],
  shipped: ["delivered", "payment_review", "refunded"],
  delivered: ["refunded"],
  // A late payment re-opens a failed or expired order. `markOrderPaid` tries
  // to reacquire the inventory and falls back to `payment_review` when it
  // cannot, so the money is never silently dropped.
  failed: ["paid", "payment_review"],
  expired: ["paid", "payment_review"],
  payment_review: ["paid", "packed", "shipped", "delivered", "refunded"],
  refunded: [],
}

/** States where the customer has paid and the goods must be dispatched. */
export const FULFILLED_STATUSES = ["paid", "packed", "shipped", "delivered"] as const

/** States where the order is finished and no further action is expected. */
export const CLOSED_STATUSES = ["delivered", "refunded", "failed", "expired"] as const

/** States in which the inventory hold is still counted against stock. */
export const HOLDING_STATUSES = ["pending", "awaiting_crypto"] as const

/**
 * Moves that must never be possible.
 *
 * Written out so the intent is reviewable rather than inferred from the
 * absence of a table entry. Each pair is a mistake someone would make: shipping
 * an unpaid order, re-opening a refund, dispatching something already
 * delivered.
 */
export const INVALID_ORDER_TRANSITIONS: ReadonlyArray<readonly [OrderStatus, OrderStatus]> = [
  ["pending", "packed"],
  ["pending", "shipped"],
  ["pending", "delivered"],
  ["awaiting_crypto", "packed"],
  ["awaiting_crypto", "shipped"],
  ["awaiting_crypto", "delivered"],
  ["failed", "packed"],
  ["failed", "shipped"],
  ["failed", "delivered"],
  ["expired", "packed"],
  ["expired", "shipped"],
  ["expired", "delivered"],
  ["refunded", "paid"],
  ["refunded", "shipped"],
  ["refunded", "delivered"],
  ["shipped", "paid"],
  ["shipped", "packed"],
  ["delivered", "paid"],
  ["delivered", "shipped"],
  ["delivered", "packed"],
]

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value)
}

export function canTransition(from: string, to: OrderStatus): boolean {
  if (!isOrderStatus(from)) return false
  return ORDER_TRANSITIONS[from].includes(to)
}

/** A transition that is not allowed is a programming error, not a customer error. */
export class InvalidOrderTransition extends Error {
  constructor(
    readonly from: string,
    readonly to: OrderStatus,
  ) {
    super(`Illegal order transition ${from} -> ${to}`)
    this.name = "InvalidOrderTransition"
  }
}
