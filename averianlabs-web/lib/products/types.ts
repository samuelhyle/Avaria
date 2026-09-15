export type Locale = "en" | "fi" | "de" | "sv" | "nl"

export type ProductCategory =
  | "metabolic"
  | "recovery"
  | "cognitive"
  | "longevity"
  | "cosmetic"
  | "blend"
  | "supplies"

export interface VialSize {
  mg: number
  sku: string
  priceCents: number
  compareAtCents?: number
  stockQty: number
  lowStockThreshold: number
  contactOnly?: boolean
}

export interface Batch {
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
