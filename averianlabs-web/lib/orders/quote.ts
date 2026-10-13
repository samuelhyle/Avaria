import crypto from "node:crypto"
import { batches, documents, products, productTranslations, vials } from "@/db/schema"
import { db } from "@/lib/db"
import type { DbExecutor } from "@/lib/email/outbox"
import { computeOrderTotals, computeShippingCents } from "@/lib/pricing"
import { and, eq, gt, inArray, isNotNull, lte, or } from "drizzle-orm"

export class OrderError extends Error {
  constructor(message: string, readonly code: "out_of_stock" | "not_found" | "invalid" | "quote_required" | "not_saleable" | "quote_changed" | "idempotency_conflict" | "attempt_expired" | "payment_mismatch" = "invalid") { super(message); this.name = "OrderError" }
}

export function normalizeItems(items: Array<{ sku: string; qty: number }>) {
  if (!items.length || items.length > 20) throw new OrderError("Invalid cart", "invalid")
  const merged = new Map<string, number>()
  for (const item of items) {
    if (!item.sku || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20) throw new OrderError("Invalid quantity", "invalid")
    const qty = (merged.get(item.sku) ?? 0) + item.qty
    if (qty > 20) throw new OrderError("Maximum quantity exceeded", "invalid")
    merged.set(item.sku, qty)
  }
  return [...merged].sort(([a], [b]) => a.localeCompare(b)).map(([sku, qty]) => ({ sku, qty }))
}

export interface QuoteLine { vialId: string; sku: string; qty: number; unitPriceCents: number; name: string; sizeValue: number; sizeUnit: string; batchId: string; batchCode: string }

export async function quoteCart(items: Array<{ sku: string; qty: number }>, shippingRateCents: number, locale = "en", executor: DbExecutor = db, lock = false) {
  const normalized = normalizeItems(items)
  const query = executor.select({ vial: vials, product: products }).from(vials).innerJoin(products, eq(products.id, vials.productId)).where(inArray(vials.sku, normalized.map((item) => item.sku))).orderBy(vials.sku)
  const rows = await (lock ? query.for("update") : query)
  if (rows.length !== normalized.length) throw new OrderError("Product not found", "not_found")
  const ids = rows.map((row) => row.vial.id)
  const [batchRows, reportRows, names] = await Promise.all([
    executor.select().from(batches).where(and(inArray(batches.vialId, ids), eq(batches.verificationStatus, "released"), isNotNull(batches.reviewedBy), isNotNull(batches.reviewedAt), gt(batches.expiresAt, new Date()))),
    executor.select({ batchId: documents.batchId }).from(documents).where(and(eq(documents.type, "coa"), eq(documents.requiresLogin, false), lte(documents.publishedAt, new Date()), or(isNotNull(documents.fileR2Key), isNotNull(documents.externalUrl)))),
    executor.select().from(productTranslations).where(and(inArray(productTranslations.productId, rows.map((row) => row.product.id)), eq(productTranslations.locale, locale))),
  ])
  const lines: QuoteLine[] = normalized.map((item) => {
    const row = rows.find((row) => row.vial.sku === item.sku)!
    const vial = row.vial
    const spec = row.product.specJson as Record<string, unknown>
    if (vial.purchaseMode !== "direct") throw new OrderError("Quote required", "quote_required")
    if (row.product.status !== "active" || spec.verified !== true || typeof spec.evidenceRef !== "string" || !spec.evidenceRef) throw new OrderError("Product is awaiting release", "not_saleable")
    const batch = batchRows.filter((batch) => batch.vialId === vial.id && reportRows.some((report) => report.batchId === batch.id)).sort((a, b) => b.manufacturedAt.getTime() - a.manufacturedAt.getTime())[0]
    if (!batch) throw new OrderError("No released batch", "not_saleable")
    if (!Number.isInteger(vial.priceCents) || vial.priceCents === null || vial.priceCents <= 0) throw new OrderError("Price unavailable", "not_saleable")
    if (vial.stockQty < item.qty) throw new OrderError("Insufficient stock", "out_of_stock")
    return { vialId: vial.id, sku: vial.sku, qty: item.qty, unitPriceCents: vial.priceCents, name: names.find((name) => name.productId === row.product.id)?.name ?? row.product.slug, sizeValue: vial.sizeValue, sizeUnit: vial.sizeUnit, batchId: batch.id, batchCode: batch.code }
  })
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.qty, 0)
  const shippingCents = computeShippingCents(subtotalCents, shippingRateCents)
  const totals = { subtotalCents, shippingCents, ...computeOrderTotals(subtotalCents, shippingCents) }
  const hash = crypto.createHash("sha256").update(JSON.stringify({ lines, totals, policy: "FI-gross-25.5-v1" })).digest("hex")
  return { lines, ...totals, hash, currency: "EUR" }
}
