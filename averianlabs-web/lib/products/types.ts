export type Locale = "en" | "fi" | "de" | "sv" | "nl"

export type ProductCategory =
  | "metabolic"
  | "recovery"
  | "cognitive"
  | "longevity"
  | "cosmetic"
  | "blend"
  | "supplies"

/** Mirrors the `vials.size_unit` DB CHECK constraint. */
export type SizeUnit = "mg" | "g" | "mcg" | "mL" | "uL" | "vial"

/** Mirrors the `vials.purchase_mode` DB CHECK constraint. */
export type PurchaseMode = "direct" | "quotation" | "unavailable"

export interface VialSize {
  /**
   * Legacy mass-only field kept for backward compat with consumers that
   * pre-date Phase 2. New code should use `sizeValue` + `sizeUnit`.
   */
  mg: number
  sizeValue: number
  sizeUnit: SizeUnit
  sku: string
  /**
   * Always present as a number in the TS layer. The DB CHECK constraint
   * requires `priceCents` to be NULL for `quotation` rows; in the static
   * catalogue, AOD-9604 uses `priceCents: 0` + `purchaseMode: "quotation"`,
   * and the server-side `createOrder` guard rejects any non-direct row
   * regardless of the price value. This keeps consumers simple without
   * weakening the data integrity guarantee.
   */
  priceCents: number
  compareAtCents?: number
  stockQty: number
  lowStockThreshold: number | null
  purchaseMode: PurchaseMode
  contactOnly?: boolean
  batch?: Batch
  documentLocales?: string[]
}

export interface Batch {
  id?: string
  code: string
  manufacturedAt: string
  expiresAt: string
  hplcPurity: number
  endotoxinEUPerMg: number
  msConfirmed: boolean
  lab: string
}

export interface ProductTranslation {
  name: string
  tagline: string
  description: string
}

export interface Product {
  /** Static reference entries are browsable but cannot establish availability or quality. */
  dataSource?: "database" | "reference"
  productType?: "peptide" | "cosmetic" | "reagent" | "supplies"
  specificationsVerified?: boolean
  createdAt?: string
  slug: string
  category: ProductCategory
  hue: number
  casNumber?: string
  molecularFormula?: string
  molecularWeight?: number
  sequence?: string
  storageTemp: string
  purityPercent?: number
  vials: VialSize[]
  latestBatch?: Batch
  translations?: Partial<Record<Locale, ProductTranslation>>
  defaultTranslation: ProductTranslation
}
