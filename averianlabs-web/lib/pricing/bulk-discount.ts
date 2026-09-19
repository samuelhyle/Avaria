/**
 * Tiered bulk discounts — applied per (product, vial) at checkout.
 *
 * Co-founder's volume tiers (decision):
 *   - 5–10 vials of the SAME SKU → 10% off
 *   - 11–20 vials of the SAME SKU → 15% off
 *   - 21+ vials of the SAME SKU → 20% off (wholesale tier — partner page
 *     offers custom quotes for even larger orders)
 *
 * The discount is computed per SKU so a cart with BPC-157 ×8 and GHK-Cu ×3
 * gets 10% off the BPC-157 line and nothing off the GHK-Cu line. The
 * `computeOrderTotals` helper in `pricing.ts` consumes the resulting
 * `discountCents` so the displayed subtotal always reflects the savings.
 *
 * Server-authoritative: the route handler must call `computeBulkDiscount`
 * on the cart items it receives and trust nothing the client computes.
 */

export interface BulkDiscountItem {
  sku: string
  qty: number
  unitPriceCents: number
}

export interface BulkDiscountLine {
  sku: string
  qty: number
  unitPriceCents: number
  /** Discount percentage applied (0 if below the 5-vial threshold). */
  percent: number
  /** Absolute discount in cents for this line. */
  discountCents: number
  /** Line subtotal AFTER discount (qty × unitPriceCents − discountCents). */
  discountedSubtotalCents: number
}

export interface BulkDiscountResult {
  lines: BulkDiscountLine[]
  /** Sum of `discountCents` across every line — the total the buyer saves. */
  discountCents: number
  /** Pre-discount subtotal in cents (sum of qty × unitPriceCents). */
  originalSubtotalCents: number
  /** Post-discount subtotal in cents (what the cart total is based on). */
  discountedSubtotalCents: number
  /** True when at least one line crossed the 5-vial threshold. */
  hasBulkTier: boolean
}

export interface BulkTier {
  /** Minimum quantity (inclusive). */
  minQty: number
  /** Discount as a fraction (0.10 = 10%). */
  percent: number
  /** Short label used by the UI badge. */
  label: string
}

/** Ordered high → low so the first match wins. */
export const BULK_TIERS: ReadonlyArray<BulkTier> = [
  { minQty: 21, percent: 0.2, label: "−20%" },
  { minQty: 11, percent: 0.15, label: "−15%" },
  { minQty: 5, percent: 0.1, label: "−10%" },
] as const

/** Below 5 vials the per-line discount is zero. */
export const BULK_TIER_MIN_QTY = BULK_TIERS.at(-1)?.minQty ?? 5

/**
 * Pick the highest tier whose `minQty <= qty`, or `null` when no tier
 * applies. Public so the cart UI can render the next-tier nudge.
 */
export function tierFor(qty: number): BulkTier | null {
  for (const tier of BULK_TIERS) {
    if (qty >= tier.minQty) return tier
  }
  return null
}

/**
 * Compute the per-line + total discount for a cart.
 *
 * Pure function — no DB access, no I/O. Safe to call on the client for
 * the "preview discount" banner, but the SERVER must call it again on the
 * canonical cart before persisting the order.
 */
export function computeBulkDiscount(items: BulkDiscountItem[]): BulkDiscountResult {
  const lines: BulkDiscountLine[] = items.map((item) => {
    const tier = tierFor(item.qty)
    const percent = tier?.percent ?? 0
    const lineSubtotalCents = item.unitPriceCents * item.qty
    const discountCents = Math.round(lineSubtotalCents * percent)
    return {
      sku: item.sku,
      qty: item.qty,
      unitPriceCents: item.unitPriceCents,
      percent,
      discountCents,
      discountedSubtotalCents: lineSubtotalCents - discountCents,
    }
  })

  const originalSubtotalCents = lines.reduce((s, l) => s + l.unitPriceCents * l.qty, 0)
  const discountCents = lines.reduce((s, l) => s + l.discountCents, 0)
  const discountedSubtotalCents = originalSubtotalCents - discountCents
  const hasBulkTier = lines.some((l) => l.percent > 0)

  return {
    lines,
    discountCents,
    originalSubtotalCents,
    discountedSubtotalCents,
    hasBulkTier,
  }
}

/** Format a percentage tier as `−10%` for badges. */
export function formatBulkTierLabel(percent: number): string {
  return `−${Math.round(percent * 100)}%`
}

/**
 * For a given current cart qty of a single SKU, return the next tier the
 * buyer can hit by adding N more vials. Returns `null` when already at the
 * top tier (21+) so the UI can hide the nudge.
 */
export function nextBulkTier(qty: number): { tier: BulkTier; unitsAway: number } | null {
  // Tiers ascend in minQty (5 → 11 → 21). Walk from the top down to find
  // the next threshold the buyer hasn't hit yet.
  const sortedAsc = [...BULK_TIERS].sort((a, b) => a.minQty - b.minQty)
  for (const tier of sortedAsc) {
    if (qty < tier.minQty) return { tier, unitsAway: tier.minQty - qty }
  }
  return null
}
