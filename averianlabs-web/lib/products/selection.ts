import type { Product } from "./types"

export function defaultVial(product: Product) {
  return (
    [...product.vials].sort((a, b) => {
      const available = (v: typeof a) => v.purchaseMode === "direct" && v.stockQty > 0
      if (available(a) !== available(b)) return available(a) ? -1 : 1
      return a.priceCents - b.priceCents
    })[0] ?? product.vials[0]!
  )
}
