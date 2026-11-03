import type { Batch, Locale, Product, VialSize } from "@/lib/products/types"
import { formatDate } from "@/lib/utils/format"

/**
 * The record a vial label carries.
 *
 * A label is read at the bench, in a hurry, and it has to answer one
 * question: is this the material I think it is? The lot code, the purity
 * that lot was measured at, the molar mass, the CAS number, the storage
 * conditions and the expiry date answer it; a barcode alone does not.
 *
 * A value the lot does not have is left out rather than printed as a dash.
 * A dash reads as a measurement that was taken and came to nothing, which
 * is worse than a row that is not there.
 */

export interface LabelRow {
  label: string
  value: string
}

/**
 * The rows printed on a lot's label.
 *
 * The order is the order a reader needs them in: what it is, then how it
 * was measured, then what it weighs, then what it is called chemically,
 * then what to do with it.
 */
export function labelRows(
  product: Pick<Product, "purityPercent" | "molecularWeight" | "casNumber" | "storageTemp">,
  vial: Pick<VialSize, "sku"> | undefined,
  batch: Batch | undefined,
  locale: Locale,
): LabelRow[] {
  const purity = batch?.hplcPurity || product.purityPercent
  const rows: LabelRow[] = [
    { label: batch ? "Lot" : "Batch", value: batch?.code ?? "" },
    { label: "Purity", value: purity ? `${purity} % HPLC` : "" },
    { label: "MW", value: product.molecularWeight ? `${product.molecularWeight} g/mol` : "" },
    { label: "CAS", value: product.casNumber ?? "" },
    { label: "Storage", value: product.storageTemp ?? "" },
    { label: "Expiry", value: batch?.expiresAt ? formatDate(batch.expiresAt, locale) : "" },
    { label: "SKU", value: vial?.sku ?? "" },
  ]
  return rows.filter((row) => row.value.length > 0)
}

/**
 * Whether the label has nothing to say.
 *
 * The catalogue's reference entries are browsable but cannot establish
 * availability or quality, so they carry no batch and no specifications.
 * A label with nothing on it but a SKU would read as a record rather than
 * as the absence of one, and the reader would take the blank space for
 * information they were not given.
 */
export function labelIsPending(rows: LabelRow[], batch: Batch | undefined): boolean {
  return !batch && rows.length <= 1
}
