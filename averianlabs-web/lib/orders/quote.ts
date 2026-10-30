import crypto from "node:crypto"
import { batches, documents, productTranslations, products, vials } from "@/db/schema"
import { CHECKOUT_TEST_SKU, isCheckoutTestProduct } from "@/lib/checkout/test-product"
import { db } from "@/lib/db"
import { publicDocumentUrl } from "@/lib/documents/availability"
import type { DbExecutor } from "@/lib/email/outbox"
import { computeOrderTotals, computeShippingCents } from "@/lib/pricing"
import {
  type Promotion,
  type PromotionResolution,
  resolvePromotion,
} from "@/lib/promotions/service"
import { and, eq, gt, inArray, isNotNull, lte, sql } from "drizzle-orm"

export class OrderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "out_of_stock"
      | "not_found"
      | "invalid"
      | "quote_required"
      | "not_saleable"
      | "quote_changed"
      | "idempotency_conflict"
      | "attempt_expired"
      | "payment_mismatch" = "invalid",
  ) {
    super(message)
    this.name = "OrderError"
  }
}

export function normalizeItems(items: Array<{ sku: string; qty: number }>) {
  if (!items.length || items.length > 20) throw new OrderError("Invalid cart", "invalid")
  const merged = new Map<string, number>()
  for (const item of items) {
    if (!item.sku || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20)
      throw new OrderError("Invalid quantity", "invalid")
    const qty = (merged.get(item.sku) ?? 0) + item.qty
    if (qty > 20) throw new OrderError("Maximum quantity exceeded", "invalid")
    merged.set(item.sku, qty)
  }
  return [...merged].sort(([a], [b]) => a.localeCompare(b)).map(([sku, qty]) => ({ sku, qty }))
}

export interface QuoteLine {
  vialId: string
  sku: string
  qty: number
  unitPriceCents: number
  name: string
  sizeValue: number
  sizeUnit: string
  batchId: string | null
  batchCode: string | null
}

export interface QuotePromotion {
  /** The full promotion row plus the discount it produced for this cart. */
  promotion: Promotion
  discountCents: number
  freeShipping: boolean
}

/** The promotion fields a customer is allowed to see. */
export function toPublicPromotion(resolved: QuotePromotion | null) {
  if (!resolved) return null
  return {
    code: resolved.promotion.code,
    kind: resolved.promotion.kind,
    label: resolved.promotion.label,
    discountCents: resolved.discountCents,
    freeShipping: resolved.freeShipping,
    minSubtotalCents: resolved.promotion.minSubtotalCents,
  }
}

export interface QuoteTotals {
  /** Product value before any promotion. */
  grossSubtotalCents: number
  /** Product value the customer pays. `grossSubtotal - discount`. */
  subtotalCents: number
  discountCents: number
  shippingCents: number
  vatCents: number
  totalCents: number
}

export async function quoteCart(
  items: Array<{ sku: string; qty: number }>,
  shippingRateCents: number,
  locale = "en",
  executor: DbExecutor = db,
  lock = false,
  promoCode?: string,
) {
  const normalized = normalizeItems(items)
  const query = executor
    .select({ vial: vials, product: products })
    .from(vials)
    .innerJoin(products, eq(products.id, vials.productId))
    .where(
      inArray(
        vials.sku,
        normalized.map((item) => item.sku),
      ),
    )
    .orderBy(vials.id)
  const rows = await (lock ? query.for("update") : query)
  if (rows.length !== normalized.length) throw new OrderError("Product not found", "not_found")
  const ids = rows.map((row) => row.vial.id)
  const [batchRows, reportRows, names] = await Promise.all([
    executor
      .select()
      .from(batches)
      .where(
        and(
          inArray(batches.vialId, ids),
          eq(batches.verificationStatus, "released"),
          isNotNull(batches.reviewedBy),
          isNotNull(batches.reviewedAt),
          gt(batches.expiresAt, new Date()),
        ),
      ),
    executor
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.type, "coa"),
          eq(documents.requiresLogin, false),
          lte(documents.publishedAt, new Date()),
          sql`ARRAY['en','fi']::text[] <@ ${documents.displayLocales}`,
        ),
      ),
    executor
      .select()
      .from(productTranslations)
      .where(
        and(
          inArray(
            productTranslations.productId,
            rows.map((row) => row.product.id),
          ),
          eq(productTranslations.locale, locale),
        ),
      ),
  ])
  const lines: QuoteLine[] = normalized.map((item) => {
    const row = rows.find((row) => row.vial.sku === item.sku)!
    const vial = row.vial
    const checkoutTest = isCheckoutTestProduct(row.product, vial)
    if (checkoutTest && (normalized.length !== 1 || item.qty !== 1 || promoCode))
      throw new OrderError("Buy one checkout test separately, without a promotion", "invalid")
    const spec = row.product.specJson as Record<string, unknown>
    if (vial.purchaseMode !== "direct") throw new OrderError("Quote required", "quote_required")
    if (
      !checkoutTest &&
      (row.product.status !== "active" ||
        spec.verified !== true ||
        typeof spec.evidenceRef !== "string" ||
        !spec.evidenceRef)
    )
      throw new OrderError("Product is awaiting release", "not_saleable")
    const batch = batchRows
      .filter(
        (batch) =>
          batch.id === (vial.activeBatchId ?? row.product.activeBatchId) &&
          batch.vialId === vial.id &&
          reportRows.some((report) => report.batchId === batch.id && publicDocumentUrl(report)),
      )
      .sort((a, b) => b.manufacturedAt.getTime() - a.manufacturedAt.getTime())[0]
    if (!batch && !checkoutTest) throw new OrderError("No released batch", "not_saleable")
    if (!Number.isInteger(vial.priceCents) || vial.priceCents === null || vial.priceCents <= 0)
      throw new OrderError("Price unavailable", "not_saleable")
    if (vial.stockQty < item.qty) throw new OrderError("Insufficient stock", "out_of_stock")
    return {
      vialId: vial.id,
      sku: vial.sku,
      qty: item.qty,
      unitPriceCents: vial.priceCents,
      name: names.find((name) => name.productId === row.product.id)?.name ?? row.product.slug,
      sizeValue: vial.sizeValue,
      sizeUnit: vial.sizeUnit,
      batchId: batch?.id ?? null,
      batchCode: batch?.code ?? null,
    }
  })
  const grossSubtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.qty, 0)
  // A rejected code prices the cart without a discount rather than failing the
  // quote, so the customer sees the real amount they will be charged.
  const promotion: PromotionResolution = promoCode
    ? await resolvePromotion(promoCode, grossSubtotalCents, executor)
    : {
        promotion: null,
        rejection: null,
        discountCents: 0,
        freeShipping: false,
        requiredCents: 0,
      }
  const discountCents = promotion.discountCents
  const subtotalCents = grossSubtotalCents - discountCents
  const shippingCents =
    lines[0]?.sku === CHECKOUT_TEST_SKU || promotion.freeShipping
      ? 0
      : computeShippingCents(subtotalCents, shippingRateCents)
  const { vatCents, totalCents } = computeOrderTotals(subtotalCents, shippingCents)
  const totals: QuoteTotals = {
    grossSubtotalCents,
    subtotalCents,
    discountCents,
    shippingCents,
    vatCents,
    totalCents,
  }
  const hash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        lines,
        totals,
        policy: "FI-gross-25.5-v1",
        // The code itself is part of the hash, so a quote priced with a code
        // can never be spent without it (and vice versa), even in the rare
        // case where the discount rounds to zero.
        promo: promotion.promotion?.code ?? null,
      }),
    )
    .digest("hex")
  return {
    lines,
    ...totals,
    hash,
    currency: "EUR",
    promotion: promotion.promotion
      ? ({
          promotion: promotion.promotion,
          discountCents: promotion.discountCents,
          freeShipping: promotion.freeShipping,
        } satisfies QuotePromotion)
      : null,
    promotionError: promotion.rejection,
    /** The minimum a rejected code required, so the customer can be told. */
    promotionRequiredCents: promotion.requiredCents,
  }
}
