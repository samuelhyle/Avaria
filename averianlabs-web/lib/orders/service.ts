import crypto from "node:crypto"
import {
  addresses,
  batches,
  documents,
  inventoryReservations,
  orderItems,
  orders,
  products,
  vials,
  webhookEvents,
} from "@/db/schema"
import { db } from "@/lib/db"
import { publicDocumentUrl } from "@/lib/documents/availability"
import { type DbExecutor, enqueueEmail } from "@/lib/email/outbox"
import { renderOrderReceipt } from "@/lib/email/receipt"
import { and, eq, gt, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm"
import { orderAccessToken } from "./access"
import { OrderError, normalizeItems, quoteCart } from "./quote"
export { OrderError } from "./quote"

export interface AddressInput {
  name?: string
  line1: string
  line2?: string
  city: string
  postal: string
  country: string
}
export interface CreateOrderInput {
  email: string
  userId?: string
  items: Array<{ sku: string; qty: number }>
  shippingCents: number
  locale?: string
  termsAccepted?: boolean
  checkoutKey?: string
  checkoutHash?: string
  expectedQuoteHash?: string
  paymentMethod?: "stripe" | "coinbase"
  vatId?: string
  shippingAddress?: AddressInput
  billingAddress?: AddressInput
  billingAddressId?: string
  shippingAddressId?: string
}
export interface OrderRecord {
  id: string
  number: string
  email: string
  status: string
  subtotalCents: number
  shippingCents: number
  vatCents: number
  totalCents: number
  currency: string
  userId: string | null
  locale: string
  placedAt: Date
  paymentMethod: string
  stripePaymentIntentId: string | null
  cryptoChargeId: string | null
}
export const RESERVATION_TTL_MINUTES = 15
const toRecord = (row: typeof orders.$inferSelect): OrderRecord => ({
  id: row.id,
  number: row.number,
  email: row.email,
  status: row.status,
  subtotalCents: row.subtotalCents,
  shippingCents: row.shippingCents,
  vatCents: row.vatCents,
  totalCents: row.totalCents,
  currency: row.currency,
  userId: row.userId,
  locale: row.locale,
  placedAt: row.placedAt,
  paymentMethod: row.paymentMethod,
  stripePaymentIntentId: row.stripePaymentIntentId,
  cryptoChargeId: row.cryptoChargeId,
})

async function storeAddress(executor: DbExecutor, userId: string | null, input: AddressInput) {
  const [row] = await executor
    .insert(addresses)
    .values({ userId, ...input, country: input.country.toUpperCase() })
    .returning({ id: addresses.id })
  if (!row) throw new OrderError("Address could not be stored")
  return row.id
}
export function createAddress(userId: string | null, input: AddressInput) {
  return storeAddress(db, userId, input)
}

export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  const items = normalizeItems(input.items)
  const key = input.checkoutKey ?? crypto.randomUUID()
  const hash =
    input.checkoutHash ??
    crypto
      .createHash("sha256")
      .update(JSON.stringify({ ...input, items }))
      .digest("hex")
  return db.transaction(async (tx) => {
    // The same attempt cannot reserve twice, including concurrent HTTP retries.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`)
    const [existing] = await tx
      .select()
      .from(orders)
      .where(eq(orders.checkoutKey, key))
      .for("update")
    if (existing) {
      if (
        existing.checkoutHash !== hash ||
        existing.email !== input.email ||
        existing.userId !== (input.userId ?? null)
      )
        throw new OrderError("Attempt parameters changed", "idempotency_conflict")
      if (["expired", "failed", "payment_review", "refunded"].includes(existing.status))
        throw new OrderError("Start a new checkout attempt", "attempt_expired")
      return toRecord(existing)
    }
    const quote = await quoteCart(items, input.shippingCents, input.locale ?? "en", tx, true)
    if (input.expectedQuoteHash && quote.hash !== input.expectedQuoteHash)
      throw new OrderError("The quote has changed", "quote_changed")
    for (const line of quote.lines)
      await tx
        .update(vials)
        .set({ stockQty: sql`${vials.stockQty} - ${line.qty}` })
        .where(eq(vials.id, line.vialId))
    const shippingAddressId = input.shippingAddress
      ? await storeAddress(tx, input.userId ?? null, input.shippingAddress)
      : input.shippingAddressId
    const billingAddressId = input.billingAddress
      ? await storeAddress(tx, input.userId ?? null, input.billingAddress)
      : input.billingAddressId
    const [order] = await tx
      .insert(orders)
      .values({
        number: `AL-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
        userId: input.userId ?? null,
        email: input.email,
        status: "pending",
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        vatCents: quote.vatCents,
        totalCents: quote.totalCents,
        currency: "EUR",
        currencyPerLine: "EUR",
        locale: input.locale ?? "en",
        termsAcceptedAt: input.termsAccepted ? new Date() : null,
        termsVersion: input.termsAccepted ? "2026-10-13" : null,
        checkoutKey: key,
        checkoutHash: hash,
        paymentMethod: input.paymentMethod ?? "stripe",
        vatId: input.vatId,
        shippingAddressId,
        billingAddressId,
      })
      .returning()
    if (!order) throw new OrderError("Order could not be stored")
    await tx.insert(orderItems).values(
      quote.lines.map((line) => ({
        orderId: order.id,
        vialId: line.vialId,
        qty: line.qty,
        unitPriceCents: line.unitPriceCents,
        batchId: line.batchId,
        batchCodeSnapshot: line.batchCode,
        skuSnapshot: line.sku,
        nameSnapshot: line.name,
        sizeValueSnapshot: line.sizeValue,
        sizeUnitSnapshot: line.sizeUnit,
      })),
    )
    await tx.insert(inventoryReservations).values(
      quote.lines.map((line) => ({
        orderId: order.id,
        vialId: line.vialId,
        qty: line.qty,
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60_000),
      })),
    )
    return toRecord(order)
  })
}

export async function getOrderById(id: string) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id))
  return row ? toRecord(row) : null
}
export async function getOrderByNumber(number: string) {
  const [row] = await db.select().from(orders).where(eq(orders.number, number))
  return row ? toRecord(row) : null
}

async function releaseHolds(executor: DbExecutor, orderId: string): Promise<number> {
  const released = await executor
    .update(inventoryReservations)
    .set({ releasedAt: new Date() })
    .where(
      and(eq(inventoryReservations.orderId, orderId), isNull(inventoryReservations.releasedAt)),
    )
    .returning({ vialId: inventoryReservations.vialId, qty: inventoryReservations.qty })
  for (const row of released.sort((a, b) => a.vialId.localeCompare(b.vialId)))
    await executor
      .update(vials)
      .set({ stockQty: sql`${vials.stockQty} + ${row.qty}` })
      .where(eq(vials.id, row.vialId))
  return released.length
}

async function queueReceipt(executor: DbExecutor, order: typeof orders.$inferSelect) {
  const lines = await executor
    .select({ line: orderItems, batchCode: batches.code })
    .from(orderItems)
    .leftJoin(batches, eq(orderItems.batchId, batches.id))
    .where(eq(orderItems.orderId, order.id))
  const batchIds = lines.map(({ line }) => line.batchId).filter((id): id is string => Boolean(id))
  const reports = batchIds.length
    ? await executor
        .select()
        .from(documents)
        .where(
          and(
            inArray(documents.batchId, batchIds),
            eq(documents.requiresLogin, false),
            lte(documents.publishedAt, new Date()),
          ),
        )
    : []
  const base = process.env.AUTH_URL ?? "https://averianlabs.eu"
  await enqueueEmail(
    {
      to: order.email,
      subject: `${order.locale === "fi" ? "Maksu vahvistettu" : "Payment confirmed"} — ${order.number}`,
      html: renderOrderReceipt({
        orderNumber: order.number,
        email: order.email,
        locale: order.locale,
        orderUrl: `${base}/${order.locale}/checkout/confirm/${order.id}?token=${orderAccessToken(order.id)}`,
        items: lines.map(({ line, batchCode }) => ({
          name: line.nameSnapshot ?? line.skuSnapshot ?? "",
          sku: line.skuSnapshot ?? undefined,
          batchCode: line.batchCodeSnapshot ?? batchCode ?? undefined,
          sizeValue: line.sizeValueSnapshot ?? 0,
          sizeUnit: line.sizeUnitSnapshot ?? "vial",
          qty: line.qty,
          priceCents: line.unitPriceCents,
        })),
        documents: reports
          .filter(
            (report) => report.displayLocales.includes(order.locale) && publicDocumentUrl(report),
          )
          .map((report) => ({
            title: report.title,
            url: `${base}/${order.locale}/documents/${report.id}`,
          })),
        subtotalCents: order.subtotalCents,
        shippingCents: order.shippingCents,
        vatCents: order.vatCents,
        totalCents: order.totalCents,
      }),
    },
    `order-paid:${order.id}`,
    executor,
  )
}

export async function markOrderPaid(
  orderId: string,
  paymentRef: string,
  kind: "stripe" | "coinbase" = "stripe",
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order) throw new OrderError("Order not found", "not_found")
    const existingRef = kind === "stripe" ? order.stripePaymentIntentId : order.cryptoChargeId
    if (order.paymentMethod !== kind || (existingRef && existingRef !== paymentRef))
      throw new OrderError("Payment reference mismatch", "payment_mismatch")
    if (["paid", "shipped", "delivered", "refunded", "payment_review"].includes(order.status))
      return false
    if (!["pending", "failed", "expired"].includes(order.status))
      throw new OrderError("Invalid payment transition")
    const holds = await tx
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, orderId))
    const released = holds
      .filter((hold) => hold.releasedAt)
      .sort((a, b) => a.vialId.localeCompare(b.vialId))
    // A payment never releases rejected, expired or reassigned research material.
    const lines = await tx
      .select({ item: orderItems, vial: vials, product: products })
      .from(orderItems)
      .innerJoin(vials, eq(orderItems.vialId, vials.id))
      .innerJoin(products, eq(vials.productId, products.id))
      .where(eq(orderItems.orderId, orderId))
      .orderBy(vials.id)
      .for("update")
    const batchIds = lines.map(({ item }) => item.batchId).filter((id): id is string => Boolean(id))
    const validBatches = batchIds.length
      ? await tx
          .select()
          .from(batches)
          .where(
            and(
              inArray(batches.id, batchIds),
              eq(batches.verificationStatus, "released"),
              isNotNull(batches.reviewedBy),
              isNotNull(batches.reviewedAt),
              gt(batches.expiresAt, new Date()),
            ),
          )
      : []
    const reports = batchIds.length
      ? await tx
          .select()
          .from(documents)
          .where(
            and(
              inArray(documents.batchId, batchIds),
              eq(documents.type, "coa"),
              eq(documents.requiresLogin, false),
              lte(documents.publishedAt, new Date()),
            ),
          )
      : []
    let reacquired =
      lines.length > 0 &&
      lines.every(({ item, vial, product }) => {
        const spec = product.specJson as Record<string, unknown>
        return (
          product.status === "active" &&
          spec.verified === true &&
          typeof spec.evidenceRef === "string" &&
          Boolean(spec.evidenceRef) &&
          vial.purchaseMode === "direct" &&
          item.batchId === (vial.activeBatchId ?? product.activeBatchId) &&
          validBatches.some((batch) => batch.id === item.batchId && batch.vialId === vial.id) &&
          reports.some(
            (report) =>
              report.batchId === item.batchId &&
              report.displayLocales.includes("en") &&
              report.displayLocales.includes("fi") &&
              publicDocumentUrl(report),
          )
        )
      })
    // A savepoint prevents a partially reacquired hold when one SKU is gone.
    if (reacquired && released.length) {
      try {
        await tx.transaction(async (savepoint) => {
          for (const hold of released) {
            const [vial] = await savepoint
              .select()
              .from(vials)
              .where(eq(vials.id, hold.vialId))
              .for("update")
            if (!vial || vial.stockQty < hold.qty)
              throw new OrderError("Late payment cannot be fulfilled", "out_of_stock")
            await savepoint
              .update(vials)
              .set({ stockQty: sql`${vials.stockQty} - ${hold.qty}` })
              .where(eq(vials.id, hold.vialId))
          }
        })
      } catch (error) {
        if (!(error instanceof OrderError)) throw error
        reacquired = false
      }
    }
    const reference =
      kind === "stripe" ? { stripePaymentIntentId: paymentRef } : { cryptoChargeId: paymentRef }
    const [updated] = await tx
      .update(orders)
      .set({ ...reference, status: reacquired ? "paid" : "payment_review", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning()
    if (!updated) throw new OrderError("Payment could not be stored")
    if (reacquired)
      await tx
        .update(inventoryReservations)
        .set({ releasedAt: new Date() })
        .where(
          and(eq(inventoryReservations.orderId, orderId), isNull(inventoryReservations.releasedAt)),
        )
    if (reacquired) await queueReceipt(tx, updated)
    else {
      await releaseHolds(tx, orderId)
      await enqueueEmail(
        {
          to: process.env.SUPPORT_EMAIL ?? "support@averianlabs.eu",
          subject: `Payment review required: ${order.number}`,
          html: `<p>Order ${order.number} received a late payment and could not reacquire its inventory. Review fulfillment or refund before contacting the customer.</p>`,
        },
        `payment-review:${order.id}`,
        tx,
      )
    }
    return true
  })
}

export async function markOrderFailed(
  orderId: string,
  status: "failed" | "expired" = "failed",
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order || order.status !== "pending") return false
    await releaseHolds(tx, orderId)
    await tx.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId))
    return true
  })
}

export async function releaseExpiredReservations(now = new Date()): Promise<number> {
  return db.transaction(async (tx) => {
    const expired = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "pending"),
          sql`exists (select 1 from inventory_reservations r where r.order_id = ${orders.id} and r.released_at is null and r.expires_at < ${now.toISOString()}::timestamptz)`,
        ),
      )
      .limit(100)
      .for("update", { skipLocked: true })
    let released = 0
    for (const order of expired) {
      released += await releaseHolds(tx, order.id)
      await tx
        .update(orders)
        .set({ status: "expired", updatedAt: now })
        .where(eq(orders.id, order.id))
    }
    return released
  })
}

export async function markOrderRefunded(orderId: string): Promise<boolean> {
  const rows = await db
    .update(orders)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        inArray(orders.status, ["paid", "shipped", "delivered", "payment_review"]),
      ),
    )
    .returning({ id: orders.id })
  return rows.length > 0
}
export async function recordCryptoTxHash(id: string, hash: string) {
  await db
    .update(orders)
    .set({ cryptoTxHash: hash, updatedAt: new Date() })
    .where(eq(orders.id, id))
}
export async function getOrderSkuQuantities(id: string) {
  return db
    .select({ sku: vials.sku, qty: orderItems.qty })
    .from(orderItems)
    .innerJoin(vials, eq(orderItems.vialId, vials.id))
    .where(eq(orderItems.orderId, id))
}
export async function hasProcessedWebhookEvent(provider: string, id: string) {
  return Boolean(
    (
      await db
        .select({ id: webhookEvents.id })
        .from(webhookEvents)
        .where(eq(webhookEvents.id, `${provider}:${id}`))
    )[0],
  )
}
export async function recordWebhookEvent(provider: string, id: string) {
  const rows = await db
    .insert(webhookEvents)
    .values({ id: `${provider}:${id}`, provider })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id })
  return rows.length > 0
}
export async function forgetWebhookEvent(provider: string, id: string) {
  await db.delete(webhookEvents).where(eq(webhookEvents.id, `${provider}:${id}`))
}
export async function sendOrderConfirmationEmail(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id))
  if (order && ["paid", "shipped", "delivered"].includes(order.status))
    await queueReceipt(db, order)
}
export async function listOrdersForUser(id: string) {
  return (await db.select().from(orders).where(eq(orders.userId, id))).map(toRecord)
}
