export type Locale = "en" | "fi" | "sv" | "ru"

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

/**
 * Why a variant cannot be ordered right now.
 *
 * The blockers form the release pipeline in the order it has to be satisfied:
 * the product is published, its specification is verified against a lot, a lot
 * is released, that lot's certificate is published, and only then is it
 * priced and stocked.
 */
export type AvailabilityBlocker =
  | "notPublished"
  | "unverifiedSpecifications"
  | "notReleased"
  | "noCertificate"
  | "noPrice"
  | "outOfStock"
  | "quotation"

/** The one thing the shopper can usefully do about the current state. */
export type AvailabilityAction = "addToCart" | "requestLot" | "notifyMe"

export interface Availability {
  /** The variant can be added to the cart right now. */
  buyable: boolean
  /** Every reason it is not buyable, in pipeline order. */
  blockers: AvailabilityBlocker[]
  /** The action the storefront offers for this state. */
  action: AvailabilityAction
}

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
  /** Why this variant can or cannot be ordered. Computed on the server. */
  availability?: Availability
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
  checkoutTest?: boolean
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
