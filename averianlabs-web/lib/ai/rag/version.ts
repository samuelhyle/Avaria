import { createHash } from "node:crypto"
import type { Product } from "@/lib/products/types"
/** Excludes mutable commercial values; those must always be read by live tools. */
export function catalogueSourceVersion(product: Product): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        source: product.dataSource,
        verified: product.specificationsVerified,
        type: product.productType,
        name: product.defaultTranslation,
        translations: product.translations,
        cas: product.casNumber,
        formula: product.molecularFormula,
        weight: product.molecularWeight,
        sequence: product.sequence,
        storage: product.storageTemp,
        variants: product.vials
          .map((v) => ({
            sku: v.sku,
            value: v.sizeValue,
            unit: v.sizeUnit,
            batch: v.batch ?? null,
          }))
          .sort((a, b) => a.sku.localeCompare(b.sku)),
      }),
    )
    .digest("hex")
}
