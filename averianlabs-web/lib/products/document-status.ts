import type { Product, VialSize } from "./types"
/** Presence of a public record is separate from batch release or purchase eligibility. */
export function hasPublishedDocuments(product: Product, locale: string, sku?: string) {
  const variants = sku ? product.vials.filter((v) => v.sku === sku) : product.vials
  return variants.some((v: VialSize) =>
    v.documentLocales ? v.documentLocales.includes(locale) : !!v.batch,
  )
}
