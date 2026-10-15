import type { Product, VialSize } from "@/lib/products/types"

/** Only a complete SKU typed for this product may override its normal default. */
export function exactSkuVariant(
  product: Pick<Product, "vials">,
  query: string,
): VialSize | undefined {
  const exact = query.trim().toLowerCase()
  return exact ? product.vials.find((variant) => variant.sku.toLowerCase() === exact) : undefined
}
