import { products } from "@/lib/products/data"
import type { Batch, Product } from "@/lib/products/types"

export interface BatchLookupResult {
  product: Product
  batch: Batch
}

/**
 * Map from batch code → { product, batch }. Built once at module load so
 * `findBatchByCode` is O(1) regardless of catalog size, and so we can match
 * historical (non-latest) batches once the catalog starts tracking them.
 */
const BATCH_INDEX: Map<string, BatchLookupResult> = (() => {
  const idx = new Map<string, BatchLookupResult>()
  for (const product of products) {
    if (product.latestBatch) {
      idx.set(product.latestBatch.code, { product, batch: product.latestBatch })
    }
  }
  return idx
})()

export function findBatchByCode(code: string): BatchLookupResult | null {
  if (!code) return null
  return BATCH_INDEX.get(code) ?? null
}

export interface BatchSummary {
  code: string
  productSlug: string
  productName: string
  category: Product["category"]
  hplcPurity: number
  endotoxinEUPerMg: number
  lab: string
  manufacturedAt: string
}

export function listBatchSummaries(): BatchSummary[] {
  return products
    .filter((p): p is Product & { latestBatch: Batch } => Boolean(p.latestBatch))
    .map((p) => ({
      code: p.latestBatch.code,
      productSlug: p.slug,
      productName: p.defaultTranslation.name,
      category: p.category,
      hplcPurity: p.latestBatch.hplcPurity,
      endotoxinEUPerMg: p.latestBatch.endotoxinEUPerMg,
      lab: p.latestBatch.lab,
      manufacturedAt: p.latestBatch.manufacturedAt,
    }))
}

/** Total number of indexed batches — exposed for tests + health checks. */
export function getIndexedBatchCount(): number {
  return BATCH_INDEX.size
}
