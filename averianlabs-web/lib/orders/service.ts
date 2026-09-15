import crypto from "node:crypto"
import {
  addresses,
  orderItems,
  orders,
  productTranslations,
  products,
  vials,
  webhookEvents,
} from "@/db/schema"
import { db } from "@/lib/db"
import { orderConfirmationHtml, sendEmail } from "@/lib/email"
import { computeOrderTotals } from "@/lib/pricing"
import { and, eq, gte, inArray, ne, sql } from "drizzle-orm"

export interface CreateOrderInput {
  email: string
  userId?: string
  items: Array<{ sku: string; qty: number }>
  shippingCents: number
  billingAddressId?: string
  shippingAddressId?: string
}

export interface AddressInput {
  name?: string
  line1: string
  line2?: string
  city: string
  postal: string
  country: string
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
}

/** Errors that are safe to surface to API clients. */
export class OrderError extends Error {
  constructor(
    message: string,
    readonly code: "out_of_stock" | "not_found" | "invalid" = "invalid",
  ) {
    super(message)
    this.name = "OrderError"
  }
}

function generateOrderNumber(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase()
  return `AL-${datePart}-${rand}`
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505"
}

export async function createAddress(userId: string | null, input: AddressInput): Promise<string> {
  const [row] = await db
    .insert(addresses)
    .values({
      userId,
      name: input.name ?? null,
      line1: input.line1,
      line2: input.line2 ?? null,
      city: input.city,
      postal: input.postal,
      country: input.country.toUpperCase(),
    })
    .returning({ id: addresses.id })
  if (!row) throw new OrderError("Failed to store address")
  return row.id
}

/**
 * Creates an order and reserves stock in a single transaction.
 *
 * Stock is decremented here (not at webhook time) so concurrent checkouts
 * cannot oversell. `restoreStockForOrder` compensates when payment ultimately
 * fails or the intent is canceled.
 */
export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  if (input.items.length === 0) throw new OrderError("Cart is empty", "invalid")

  return db.transaction(async (tx) => {
    const skus = [...new Set(input.items.map((i) => i.sku))]
    const vialRows = await tx.select().from(vials).where(inArray(vials.sku, skus)).for("update")
    const vialMap = new Map(vialRows.map((v) => [v.sku, v]))

    let subtotalCents = 0
    const orderItemRows: Array<{ vialId: string; qty: number; unitPriceCents: number }> = []

    for (const item of input.items) {
      const vial = vialMap.get(item.sku)
      if (!vial) throw new OrderError(`Product not found: ${item.sku}`, "not_found")

      // Conditional update — fails atomically if another transaction took the stock.
      const reserved = await tx
        .update(vials)
        .set({ stockQty: sql`${vials.stockQty} - ${item.qty}` })
        .where(and(eq(vials.id, vial.id), gte(vials.stockQty, item.qty)))
        .returning({ id: vials.id })

      if (reserved.length === 0) {
        throw new OrderError(`Insufficient stock for ${item.sku}`, "out_of_stock")
      }

      subtotalCents += vial.priceCents * item.qty
      orderItemRows.push({ vialId: vial.id, qty: item.qty, unitPriceCents: vial.priceCents })
    }

    const { vatCents, totalCents } = computeOrderTotals(subtotalCents, input.shippingCents)

    let order: typeof orders.$inferSelect | undefined
    for (let attempt = 0; attempt < 5 && !order; attempt++) {
      try {
        const inserted = await tx
          .insert(orders)
          .values({
            number: generateOrderNumber(),
            userId: input.userId ?? null,
            email: input.email,
            status: "pending",
            subtotalCents,
            shippingCents: input.shippingCents,
            vatCents,
            totalCents,
            currency: "EUR",
            billingAddressId: input.billingAddressId ?? null,
            shippingAddressId: input.shippingAddressId ?? null,
          })
          .returning()
        order = inserted[0]
      } catch (err) {
        if (!isUniqueViolation(err) || attempt === 4) throw err
      }
    }

    if (!order) throw new OrderError("Failed to create order")

    await tx.insert(orderItems).values(
      orderItemRows.map((item) => ({
        orderId: order.id,
        vialId: item.vialId,
        qty: item.qty,
        unitPriceCents: item.unitPriceCents,
      })),
    )

    return toRecord(order)
  })
}

function toRecord(row: typeof orders.$inferSelect): OrderRecord {
  return {
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
  }
}

export async function getOrderById(orderId: string): Promise<OrderRecord | null> {
  const row = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
  return row ? toRecord(row) : null
}

export async function getOrderByNumber(number: string): Promise<OrderRecord | null> {
  const row = await db.query.orders.findFirst({ where: eq(orders.number, number) })
  return row ? toRecord(row) : null
}

/**
 * Marks an order paid. Returns false when the order was already paid (or does
 * not exist) so webhook handlers can skip side effects like sending email.
 */
export async function markOrderPaid(
  orderId: string,
  paymentRef: string,
  kind: "stripe" | "coinbase" = "stripe",
): Promise<boolean> {
  const updated = await db
    .update(orders)
    .set({
      status: "paid",
      ...(kind === "stripe"
        ? { stripePaymentIntentId: paymentRef }
        : { cryptoChargeId: paymentRef }),
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), ne(orders.status, "paid")))
    .returning({ id: orders.id })
  return updated.length > 0
}

export async function markOrderFailed(orderId: string): Promise<boolean> {
  const updated = await db
    .update(orders)
    .set({ status: "failed", updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
    .returning({ id: orders.id })
  return updated.length > 0
}

export async function markOrderRefunded(orderId: string): Promise<boolean> {
  const updated = await db
    .update(orders)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id })
  return updated.length > 0
}

export async function recordCryptoTxHash(orderId: string, txHash: string): Promise<void> {
  await db
    .update(orders)
    .set({ cryptoTxHash: txHash, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
}

/** Returns all vial SKUs of an order with quantities (for stock restore). */
export async function getOrderSkuQuantities(
  orderId: string,
): Promise<Array<{ sku: string; qty: number }>> {
  const rows = await db
    .select({ sku: vials.sku, qty: orderItems.qty })
    .from(orderItems)
    .innerJoin(vials, eq(vials.id, orderItems.vialId))
    .where(eq(orderItems.orderId, orderId))
  return rows
}

/** Compensating update used when payment fails or is canceled. */
export async function restoreStock(items: Array<{ sku: string; qty: number }>): Promise<void> {
  if (items.length === 0) return
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(vials)
        .set({ stockQty: sql`${vials.stockQty} + ${item.qty}` })
        .where(eq(vials.sku, item.sku))
    }
  })
}

/**
 * Idempotency ledger for webhook providers. Returns true the first time an
 * event id is seen; false on every replay.
 */
export async function recordWebhookEvent(provider: string, eventId: string): Promise<boolean> {
  const rows = await db
    .insert(webhookEvents)
    .values({ id: `${provider}:${eventId}`, provider })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id })
  return rows.length > 0
}

/** Removes the ledger row when processing failed so the provider can retry. */
export async function forgetWebhookEvent(provider: string, eventId: string): Promise<void> {
  await db.delete(webhookEvents).where(eq(webhookEvents.id, `${provider}:${eventId}`))
}

/** Sends the order confirmation email (idempotency is the caller's job). */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const order = await getOrderById(orderId)
  if (!order) return

  const items = await db
    .select({
      sku: vials.sku,
      qty: orderItems.qty,
      priceCents: orderItems.unitPriceCents,
      mg: vials.sizeMg,
      productName: productTranslations.name,
    })
    .from(orderItems)
    .innerJoin(vials, eq(orderItems.vialId, vials.id))
    .innerJoin(products, eq(vials.productId, products.id))
    .leftJoin(
      productTranslations,
      and(
        eq(products.id, productTranslations.productId),
        eq(productTranslations.locale, order.locale),
      ),
    )
    .where(eq(orderItems.orderId, orderId))

  const seen = new Set<string>()
  const uniqueItems = items.filter((i) => {
    if (seen.has(i.sku)) return false
    seen.add(i.sku)
    return true
  })

  await sendEmail({
    to: order.email,
    subject: `Order confirmed — ${order.number}`,
    html: orderConfirmationHtml({
      orderNumber: order.number,
      email: order.email,
      items: uniqueItems.map((i) => ({
        name: i.productName ?? i.sku,
        mg: i.mg,
        qty: i.qty,
        priceCents: i.priceCents,
      })),
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      vatCents: order.vatCents,
      totalCents: order.totalCents,
    }),
  })
}

export async function listOrdersForUser(userId: string): Promise<OrderRecord[]> {
  const rows = await db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: (orders, { desc }) => [desc(orders.placedAt)],
  })
  return rows.map(toRecord)
}
