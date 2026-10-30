import crypto from "node:crypto"
import {
  addresses,
  batches,
  cryptoCheckoutSessions,
  documents,
  inventoryReservations,
  orderItems,
  orders,
  products,
  shipments,
  vials,
  webhookEvents,
} from "@/db/schema"
import { isCheckoutTestProduct } from "@/lib/checkout/test-product"
import { CHAINS, type ChainId } from "@/lib/crypto/chains"
import { db } from "@/lib/db"
import { publicDocumentUrl } from "@/lib/documents/availability"
import { shippingConfirmationHtml } from "@/lib/email"
import { type DbExecutor, enqueueEmail } from "@/lib/email/outbox"
import { renderOrderReceipt } from "@/lib/email/receipt"
import { logger } from "@/lib/logger"
import { recordPromotionRedemption } from "@/lib/promotions/service"
import { and, desc, eq, gt, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm"
import { orderAccessToken } from "./access"
import { OrderError, normalizeItems, quoteCart } from "./quote"
import { InvalidOrderTransition, type OrderStatus, canTransition } from "./status"
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
  paymentMethod?: "stripe" | "coinbase" | "crypto"
  vatId?: string
  /** Promotion code to resolve server-side. Ignored when it does not apply. */
  promoCode?: string
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
  discountCents: number
  promoCode: string | null
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
  cryptoTxHash: string | null
}
export const RESERVATION_TTL_MINUTES = 15
/**
 * A crypto transfer takes minutes to hours, not seconds. The card window
 * would expire the hold and release the stock long before the money lands,
 * so crypto orders get a much longer window. A payment that arrives after it
 * still lands: `markOrderPaid` tries to reacquire the inventory and falls back
 * to `payment_review` when it cannot.
 */
export const CRYPTO_RESERVATION_TTL_HOURS = 6
const toRecord = (row: typeof orders.$inferSelect): OrderRecord => ({
  id: row.id,
  number: row.number,
  email: row.email,
  status: row.status,
  subtotalCents: row.subtotalCents,
  discountCents: row.discountCents,
  promoCode: row.promoCode,
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
  cryptoTxHash: row.cryptoTxHash,
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
    const quote = await quoteCart(
      items,
      input.shippingCents,
      input.locale ?? "en",
      tx,
      true,
      input.promoCode,
    )
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
    const initialStatus = input.paymentMethod === "crypto" ? "awaiting_crypto" : "pending"
    const reservationExpiry = new Date(
      Date.now() +
        (input.paymentMethod === "crypto"
          ? CRYPTO_RESERVATION_TTL_HOURS * 60 * 60_000
          : RESERVATION_TTL_MINUTES * 60_000),
    )
    const [order] = await tx
      .insert(orders)
      .values({
        number: `AL-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
        userId: input.userId ?? null,
        email: input.email,
        status: initialStatus,
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
        discountCents: quote.discountCents,
        promoCode: quote.promotion?.promotion.code ?? null,
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
        expiresAt: reservationExpiry,
      })),
    )
    // The redemption is written with the order so a failed order rolls it back
    // together with the discount it was granted.
    if (quote.promotion)
      await recordPromotionRedemption(
        tx,
        quote.promotion.promotion,
        order.id,
        input.email,
        quote.promotion.discountCents,
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
  // A crypto receipt carries the amount that was sent and the transaction that
  // paid for it: there is no card statement to fall back on.
  const [session] = await executor
    .select()
    .from(cryptoCheckoutSessions)
    .where(eq(cryptoCheckoutSessions.orderId, order.id))
    .limit(1)
  const crypto = session
    ? {
        chainLabel: CHAINS[session.chain as ChainId]?.label ?? session.chain,
        symbol: CHAINS[session.chain as ChainId]?.symbol ?? session.chain,
        amount: session.amountCrypto,
        txHash: order.cryptoTxHash ?? order.cryptoChargeId ?? "",
        rateEurPerUnit: session.rateEurPerUnit,
      }
    : undefined
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
        crypto,
      }),
    },
    `order-paid:${order.id}`,
    executor,
  )
}

export async function markOrderPaid(
  orderId: string,
  paymentRef: string,
  kind: "stripe" | "coinbase" | "crypto" = "stripe",
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order) throw new OrderError("Order not found", "not_found")
    const existingRef = kind === "stripe" ? order.stripePaymentIntentId : order.cryptoChargeId
    if (order.paymentMethod !== kind || (existingRef && existingRef !== paymentRef))
      throw new OrderError("Payment reference mismatch", "payment_mismatch")
    if (
      ["paid", "packed", "shipped", "delivered", "refunded", "payment_review"].includes(
        order.status,
      )
    )
      return false
    if (!canTransition(order.status, "paid")) throw new OrderError("Invalid payment transition")
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
        if (isCheckoutTestProduct(product, vial))
          return (
            lines.length === 1 &&
            item.qty === 1 &&
            item.batchId === null &&
            item.unitPriceCents === 150 &&
            order.totalCents === 150 &&
            order.shippingCents === 0 &&
            order.discountCents === 0
          )
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
    await transitionOrder(tx, orderId, reacquired ? "paid" : "payment_review")
    const [updated] = await tx
      .update(orders)
      .set({ ...reference, updatedAt: new Date() })
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
    // A referral discount on this order earns the referrer their credit. It
    // runs after the transaction so a failure here cannot roll back the payment.
    if (reacquired) {
      const { settleReferralCredit } = await import("@/lib/referral/service")
      await settleReferralCredit(orderId).catch((error) =>
        logger.error("[referral] credit settlement failed", error),
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
    if (!order) return false
    // A crypto order waits in `awaiting_crypto` for the transfer to land.
    if (!canTransition(order.status, status)) return false
    await releaseHolds(tx, orderId)
    await transitionOrder(tx, orderId, status)
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
          // A crypto order waits in `awaiting_crypto` for the transfer to land;
          // its hold has to be released too when the window closes.
          inArray(orders.status, ["pending", "awaiting_crypto"]),
          sql`exists (select 1 from inventory_reservations r where r.order_id = ${orders.id} and r.released_at is null and r.expires_at < ${now.toISOString()}::timestamptz)`,
        ),
      )
      .limit(100)
      .for("update", { skipLocked: true })
    let released = 0
    for (const order of expired) {
      released += await releaseHolds(tx, order.id)
      await transitionOrder(tx, order.id, "expired")
    }
    return released
  })
}

/**
 * Mark an order as refunded and put the goods back on the shelf.
 *
 * The stock restoration lives here rather than in the refund service, because a
 * refund performed in the payment provider's dashboard reaches the order
 * through the webhook and must restore the stock too.
 */
export async function markOrderRefunded(orderId: string): Promise<boolean> {
  const rows = await db
    .update(orders)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(
      and(
        eq(orders.id, orderId),
        inArray(orders.status, ["paid", "packed", "shipped", "delivered", "payment_review"]),
      ),
    )
    .returning({ id: orders.id })
  if (!rows.length) return false
  await restoreOrderStock(orderId)
  return true
}

/**
 * Put the goods of a refunded order back into stock.
 *
 * A cancelled or refunded order releases its inventory hold and the stock
 * returns to the shelf. Called when an order is failed, expired or refunded.
 */
export async function restoreOrderStock(orderId: string): Promise<number> {
  return db.transaction(async (tx) => {
    const released = await tx
      .update(inventoryReservations)
      .set({ releasedAt: new Date() })
      .where(
        and(eq(inventoryReservations.orderId, orderId), isNull(inventoryReservations.releasedAt)),
      )
      .returning({ vialId: inventoryReservations.vialId, qty: inventoryReservations.qty })
    for (const row of released.sort((a, b) => a.vialId.localeCompare(b.vialId)))
      await tx
        .update(vials)
        .set({ stockQty: sql`${vials.stockQty} + ${row.qty}` })
        .where(eq(vials.id, row.vialId))
    return released.length
  })
}

/**
 * Move an order to a new status, refusing illegal moves.
 *
 * Every status write in the codebase goes through here so the transition table
 * in `lib/orders/status.ts` is the single authority.
 */
export async function transitionOrder(
  executor: DbExecutor,
  orderId: string,
  to: OrderStatus,
): Promise<void> {
  const [row] = await executor
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)
  if (!row) throw new OrderError("Order not found", "not_found")
  if (row.status === to) return
  if (!canTransition(row.status, to)) throw new InvalidOrderTransition(row.status, to)
  await executor
    .update(orders)
    .set({ status: to, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
}

export interface ShipmentInput {
  carrier: string
  service: string
  trackingNumber?: string | null
  labelUrl?: string | null
}

/**
 * Record a dispatch and move the order to `shipped`.
 *
 * Writes the `shipments` row the AI tools already read, sends the shipping
 * confirmation email, and leaves the customer-facing status consistent with
 * the carrier handover.
 */
export async function markOrderShipped(
  orderId: string,
  input: ShipmentInput,
): Promise<{ shipmentId: string; orderNumber: string }> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order) throw new OrderError("Order not found", "not_found")
    const [shipment] = await tx
      .insert(shipments)
      .values({
        orderId,
        carrier: input.carrier,
        service: input.service,
        trackingNumber: input.trackingNumber ?? null,
        labelUrl: input.labelUrl ?? null,
        status: input.trackingNumber ? "in_transit" : "label_created",
        shippedAt: new Date(),
      })
      .returning({ id: shipments.id })
    if (!shipment) throw new OrderError("Shipment could not be stored")
    await transitionOrder(tx, orderId, "shipped")
    if (input.trackingNumber)
      await enqueueEmail(
        {
          to: order.email,
          subject:
            order.locale === "fi"
              ? `Tilaus on lähetetty — ${order.number}`
              : `Your order has shipped — ${order.number}`,
          html: shippingConfirmationHtml({
            locale: order.locale === "fi" ? "fi" : "en",
            orderNumber: order.number,
            carrier: input.carrier,
            trackingNumber: input.trackingNumber,
            trackingUrl: input.labelUrl ?? undefined,
          }),
        },
        `order-shipped:${orderId}:${shipment.id}`,
        tx,
      )
    return { shipmentId: shipment.id, orderNumber: order.number }
  })
}

/** Move a dispatched order to `delivered`. */
export async function markOrderDelivered(orderId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order) return false
    if (!canTransition(order.status, "delivered")) return false
    await tx
      .update(orders)
      .set({ status: "delivered", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
    await tx
      .update(shipments)
      .set({ status: "delivered", deliveredAt: new Date() })
      .where(and(eq(shipments.orderId, orderId), isNull(shipments.deliveredAt)))
    return true
  })
}

/** Mark a paid order as packed, ready for carrier handover. */
export async function markOrderPacked(orderId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    if (!order) return false
    if (!canTransition(order.status, "packed")) return false
    await tx
      .update(orders)
      .set({ status: "packed", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
    return true
  })
}

/** Every shipment recorded against an order, newest first. */
export async function listShipments(orderId: string) {
  return db.select().from(shipments).where(eq(shipments.orderId, orderId))
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

/**
 * A signed-in customer's orders with their lines.
 *
 * The account order list shows what was bought, so a returning customer can
 * reorder from it. The lines carry the price that was paid, which is what the
 * reorder notice compares the current price against.
 */
export async function listOrdersForUserWithLines(id: string) {
  const rows = await db
    .select({ order: orders, line: orderItems })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.userId, id))
    .orderBy(desc(orders.placedAt))
  const byOrder = new Map<
    string,
    { order: OrderRecord; lines: (typeof orderItems.$inferSelect)[] }
  >()
  for (const row of rows) {
    const existing = byOrder.get(row.order.id)
    const record = existing?.order ?? toRecord(row.order)
    if (existing) {
      if (row.line) existing.lines.push(row.line)
    } else byOrder.set(row.order.id, { order: record, lines: row.line ? [row.line] : [] })
  }
  return [...byOrder.values()]
}
