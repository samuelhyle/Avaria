/**
 * Output verification — runs after the agent streams its reply.
 *
 * Detects:
 *   - SKUs the model mentioned that don't exist in the catalog
 *   - Price mentions that don't match the catalog (off by >5%)
 *   - Medical-claim / human-use language patterns (defensive — appends a
 *     research-use reminder if detected)
 *
 * Returns a structured `VerificationReport` so the route can append the
 * footer + log a warning event. We never block or re-generate; Phase A6 is
 * observability-first, Phase A7 may escalate to re-generation.
 */

import { type Product, products } from "@/lib/products/data"

export interface PriceRef {
  sku: string
  cents: number
}

export interface VerificationReport {
  passed: boolean
  warnings: string[]
  unknownSkus: string[]
  priceMismatches: Array<{ sku: string; citedCents: number; catalogCents: number }>
  needsMedicalReminder: boolean
}

const MEDICAL_PATTERNS: RegExp[] = [
  /\b(patients?|humans?|self|inject|personal use)\b.*\b(should|need|recommend|safe|effective|dose)\b/i,
  /\b(therapeutic|clinical|medical)\b.*\b(use|value|outcome)\b/i,
  /\bside effects?\b/i,
  /\bcontraindications?\b/i,
  /\bfor treating\b/i,
  /\bfor (preventing|curing|healing)\b/i,
]

const SKU_PATTERN = /\b([A-Z]{2,5}-\d{2,4})\b/g
/** Matches "€39.90", "39,90 €", "EUR 49.00", "$12.50", "$12". */
const PRICE_PATTERN =
  /(?:€|EUR|\$|USD|£|GBP)?\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:€|EUR|\$|USD|£|GBP)/g

/** Tolerate ±5% — accounts for currency-conversion rounding. */
const PRICE_TOLERANCE = 0.05

function priceToCents(raw: string): number | null {
  // Normalize "39,90" → 39.90 and "1,234.50" → 1234.50.
  const cleaned = raw.replace(/\s/g, "")
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",")
    const lastDot = cleaned.lastIndexOf(".")
    if (lastComma > lastDot) {
      const v = Number.parseFloat(cleaned.replace(/\./g, "").replace(",", "."))
      return Number.isFinite(v) ? Math.round(v * 100) : null
    }
  }
  if (cleaned.includes(",")) {
    const v = Number.parseFloat(cleaned.replace(",", "."))
    return Number.isFinite(v) ? Math.round(v * 100) : null
  }
  const v = Number.parseFloat(cleaned)
  return Number.isFinite(v) ? Math.round(v * 100) : null
}

export function extractSkus(text: string): string[] {
  const matches = text.match(SKU_PATTERN)
  return matches ? Array.from(new Set(matches)) : []
}

export function extractPrices(text: string): Array<{ sku?: string; cents: number; raw: string }> {
  const results: Array<{ sku?: string; cents: number; raw: string }> = []
  for (const m of text.matchAll(PRICE_PATTERN)) {
    const cents = priceToCents(m[1] ?? "")
    if (cents === null) continue
    // Heuristic: if a SKU appears within ~50 chars before the price, link them.
    const idx = m.index ?? 0
    const before = text.slice(Math.max(0, idx - 50), idx)
    const skuMatch = before.match(SKU_PATTERN)
    results.push({ sku: skuMatch?.[0], cents, raw: m[0] })
  }
  return results
}

function buildCatalogIndex() {
  const bySku = new Map<string, { product: Product; mg: number; cents: number }>()
  for (const p of products) {
    for (const v of p.vials) {
      bySku.set(v.sku, { product: p, mg: v.mg, cents: v.priceCents })
    }
  }
  return bySku
}

export function verifyResponse(text: string): VerificationReport {
  const warnings: string[] = []
  const unknownSkus: string[] = []
  const priceMismatches: Array<{ sku: string; citedCents: number; catalogCents: number }> = []

  const catalog = buildCatalogIndex()

  // SKU check
  const skus = extractSkus(text)
  for (const sku of skus) {
    if (!catalog.has(sku)) {
      unknownSkus.push(sku)
      warnings.push(`unknown_sku:${sku}`)
    }
  }

  // Price check — only against cited SKUs in the response.
  const prices = extractPrices(text)
  for (const p of prices) {
    if (!p.sku) continue
    const entry = catalog.get(p.sku)
    if (!entry) continue
    const delta = Math.abs(p.cents - entry.cents) / Math.max(entry.cents, 1)
    if (delta > PRICE_TOLERANCE) {
      priceMismatches.push({ sku: p.sku, citedCents: p.cents, catalogCents: entry.cents })
      warnings.push(`price_mismatch:${p.sku}`)
    }
  }

  const needsMedicalReminder = MEDICAL_PATTERNS.some((rx) => rx.test(text))

  return {
    passed: warnings.length === 0,
    warnings,
    unknownSkus,
    priceMismatches,
    needsMedicalReminder,
  }
}
