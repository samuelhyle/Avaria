import type { Product, VialSize } from "@/lib/products/types"

/**
 * Return the cheapest purchasable vial for a product, or null when the product
 * has no vials to sell (should not happen in the current catalogue but kept
 * defensively so callers don't need to non-null-assert).
 *
 * "Cheapest" means lowest `priceCents`. When two vials tie on price, the
 * one earlier in the `vials` array wins (matches the previous behaviour).
 */
export function findCheapestVial(product: Product): VialSize | null {
  if (product.vials.length === 0) return null
  let min: VialSize | null = product.vials[0] ?? null
  if (!min) return null
  for (let i = 1; i < product.vials.length; i++) {
    const v = product.vials[i]
    if (!v) continue
    if (v.priceCents < min.priceCents) min = v
  }
  return min
}

/**
 * Sum stock across every vial of a product. Replaces the
 * `vials.reduce((s, v) => s + v.stockQty, 0)` pattern duplicated in 6+
 * components and routes.
 */
export function totalStock(product: Product): number {
  let sum = 0
  for (const v of product.vials) sum += v.stockQty
  return sum
}

/**
 * A vial is "contact-only" when the catalogue has flagged it explicitly or
 * when its price is unset (the conventional sentinel for "request a quote").
 */
export function isContactOnly(vial: VialSize): boolean {
  return vial.contactOnly === true || vial.priceCents === 0
}

export type StockState = "in_stock" | "low_stock" | "out_of_stock" | "contact_only"

/**
 * Combined stock / availability summary for a product, computed once and
 * re-used by ProductCard, CompareTable, QuickView, sticky ATCs, etc.
 */
export interface ProductStockSummary {
  total: number
  /** When every vial is contact-only (or there are no vials), everything else is irrelevant. */
  contactOnly: boolean
  /** True when the product is purchasable but every vial is sold out. */
  outOfStock: boolean
  /** True when the product has purchasable stock but < 25 units in aggregate. */
  lowStock: boolean
}

export function stockState(product: Product): ProductStockSummary {
  const total = totalStock(product)
  // A product with no vials to sell is, by definition, contact-only.
  // Otherwise contact-only wins only when every vial is contact-only — the
  // previous logic only looked at the cheapest vial, which made a
  // hypothetical "0€ quote vial + 50€ standard vial" product show as
  // contact-only even though the user could buy the standard one.
  const contactOnly = product.vials.length === 0 || product.vials.every((v) => isContactOnly(v))
  return {
    total,
    contactOnly,
    outOfStock: !contactOnly && total === 0,
    lowStock: !contactOnly && total > 0 && total < 25,
  }
}

/** Narrower helper: returns the single state label the UI cares about most. */
export function stockStateLabel(product: Product): StockState {
  const s = stockState(product)
  if (s.contactOnly) return "contact_only"
  if (s.outOfStock) return "out_of_stock"
  if (s.lowStock) return "low_stock"
  return "in_stock"
}
