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

/**
 * Catalog SKU format: 2–6 uppercase letters, optional digits in the prefix,
 * then a hyphen and 1–4 digits. Examples: `BPC-157`, `BPC157-5`,
 * `BACW-10`, `GHKCU-50`, `NAD-1000`, `CJC-1`, `MT2-10`.
 *
 * Also matches the peptide name part of common name-like codes (e.g. when
 * the model paraphrases "BPC-157"). We intentionally keep the digit-tail
 * loose so `CJC-1` (1-digit vials) and `NAD-1000` (4-digit mg) both fit.
 * Blend SKUs (`BPC-TB-10`) have a second hyphen — matched by BLEND_SKU_PATTERN.
 */
const SKU_PATTERN = /\b([A-Z]{2,6}[A-Z0-9]{0,4}-\d{1,4})\b/g
const BLEND_SKU_PATTERN = /\b([A-Z]{2,6}[A-Z0-9]{0,2}-[A-Z]{2,6}[A-Z0-9]{0,2}-\d{1,4})\b/g
/**
 * Matches `€39.90`, `39,90 €`, `EUR 49.00`, `$12.50`, `$12`, `$12.50 today`.
 * At least one currency marker is required (prefix or suffix) to avoid
 * matching arbitrary bare numbers.
 */
const PRICE_PATTERN =
  /(?:€|EUR|\$|USD|£|GBP)?\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:€|EUR|\$|USD|£|GBP)?/g
/** Sanity-check that at least one currency marker was actually consumed. */
const PRICE_HAS_CURRENCY = /(?:€|EUR|\$|USD|£|GBP)/

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
  // Blend SKUs first (they're longer and more specific); the generic
  // SKU_PATTERN would otherwise also extract a substring like "TB-10".
  const blendMatches = text.match(BLEND_SKU_PATTERN) ?? []
  // Strip blend matches from the text before the generic pass so we don't
  // double-count. `BPC-TB-10` becomes a placeholder so `BPC-157` wouldn't
  // be mis-extracted from it (the prefix `BPC` has no digit-tail anyway).
  let scrubbed = text
  for (const m of blendMatches) scrubbed = scrubbed.split(m).join("\u0000")
  const matches = scrubbed.match(SKU_PATTERN) ?? []
  // Defensive: a SKU that appears as a substring of a blend SKU should not
  // be re-listed (e.g. `TB-10` inside `BPC-TB-10`). Replace those with empty
  // before deduping.
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of blendMatches) {
    if (!seen.has(m)) {
      seen.add(m)
      out.push(m)
    }
  }
  for (const m of matches) {
    if (m.includes("\u0000")) continue
    if (!seen.has(m)) {
      seen.add(m)
      out.push(m)
    }
  }
  return out
}

export function extractPrices(text: string): Array<{ sku?: string; cents: number; raw: string }> {
  const results: Array<{ sku?: string; cents: number; raw: string }> = []
  for (const m of text.matchAll(PRICE_PATTERN)) {
    // At least one currency marker must appear in the matched span — otherwise
    // we'd extract every bare integer (e.g. "10 vials", "5 stars").
    if (!PRICE_HAS_CURRENCY.test(m[0])) continue
    const cents = priceToCents(m[1] ?? "")
    if (cents === null) continue
    // Heuristic: if a SKU appears within ~50 chars before the price, link them.
    // Match blend SKUs (e.g. `BPC-TB-10`) first — without this branch the
    // generic SKU_PATTERN picks up `TB-10` (which isn't a catalog row) and the
    // price/SKU comparison silently no-ops.
    const idx = m.index ?? 0
    const before = text.slice(Math.max(0, idx - 50), idx)
    const blendMatch = before.match(BLEND_SKU_PATTERN)
    const skuMatch = blendMatch ?? before.match(SKU_PATTERN)
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
