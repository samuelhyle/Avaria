import {
  addresses,
  cryptoCheckoutSessions,
  orderItems,
  orders,
  shipments,
  vials,
} from "@/db/schema"
import { db } from "@/lib/db"
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm"

/**
 * Admin order queries.
 *
 * Read-only helpers shared by the admin order list, the order detail page and
 * the admin API. Nothing here writes — every mutation goes through
 * `lib/orders/service.ts` so the status machine stays authoritative.
 */

export interface AdminOrderListFilters {
  status?: string
  paymentMethod?: string
  /** Free-text match on the order number or the customer email. */
  query?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface AdminOrderSummary {
  id: string
  number: string
  email: string
  status: string
  paymentMethod: string
  totalCents: number
  currency: string
  locale: string
  discountCents: number
  promoCode: string | null
  placedAt: Date
  itemCount: number
}

export async function listAdminOrders(
  filters: AdminOrderListFilters = {},
): Promise<{ orders: AdminOrderSummary[]; total: number }> {
  const conditions = []
  if (filters.status && filters.status !== "all") conditions.push(eq(orders.status, filters.status))
  if (filters.paymentMethod && filters.paymentMethod !== "all")
    conditions.push(eq(orders.paymentMethod, filters.paymentMethod))
  if (filters.query) {
    const needle = `%${filters.query.trim()}%`
    const matches = or(ilike(orders.number, needle), ilike(orders.email, needle))
    if (matches) conditions.push(matches)
  }
  if (filters.from) conditions.push(gte(orders.placedAt, new Date(filters.from)))
  if (filters.to) conditions.push(lte(orders.placedAt, new Date(`${filters.to}T23:59:59.999Z`)))
  const where = conditions.length ? and(...conditions) : undefined

  const limit = Math.min(200, Math.max(1, filters.limit ?? 50))
  const offset = Math.max(0, filters.offset ?? 0)

  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      email: orders.email,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      totalCents: orders.totalCents,
      currency: orders.currency,
      locale: orders.locale,
      discountCents: orders.discountCents,
      promoCode: orders.promoCode,
      placedAt: orders.placedAt,
      itemCount: sql<number>`coalesce(sum(${orderItems.qty}), 0)::int`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(where)
    .groupBy(orders.id)
    .orderBy(desc(orders.placedAt))
    .limit(limit)
    .offset(offset)

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(orders)
    .where(where)

  return {
    orders: rows.map((row) => ({ ...row, itemCount: Number(row.itemCount ?? 0) })),
    total: countRow?.total ?? 0,
  }
}

export interface AdminOrderDetail extends AdminOrderSummary {
  subtotalCents: number
  shippingCents: number
  vatCents: number
  userId: string | null
  stripePaymentIntentId: string | null
  cryptoChargeId: string | null
  cryptoTxHash: string | null
  /** The crypto invoice, when the order was paid with cryptocurrency. */
  cryptoSession: {
    id: string
    chain: string
    amountCrypto: string
    amountEurCents: number
    rateEurPerUnit: number
    walletAddress: string
    status: string
    expiresAt: Date
    telegramChatId: string | null
  } | null
  shippingAddress: {
    name: string | null
    line1: string
    line2: string | null
    city: string
    postal: string
    country: string
  } | null
  items: Array<{
    id: string
    sku: string | null
    name: string | null
    sizeValue: number | null
    sizeUnit: string | null
    batchCode: string | null
    qty: number
    unitPriceCents: number
  }>
  shipments: Array<{
    id: string
    carrier: string
    service: string
    trackingNumber: string | null
    labelUrl: string | null
    status: string
    shippedAt: Date | null
    deliveredAt: Date | null
  }>
}

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
  if (!row) return null
  const [itemRows, shipmentRows, addressRows, sessionRows] = await Promise.all([
    db
      .select({
        id: orderItems.id,
        sku: orderItems.skuSnapshot,
        name: orderItems.nameSnapshot,
        sizeValue: orderItems.sizeValueSnapshot,
        sizeUnit: orderItems.sizeUnitSnapshot,
        batchCode: orderItems.batchCodeSnapshot,
        qty: orderItems.qty,
        unitPriceCents: orderItems.unitPriceCents,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId)),
    db.select().from(shipments).where(eq(shipments.orderId, orderId)),
    row.shippingAddressId
      ? db.select().from(addresses).where(eq(addresses.id, row.shippingAddressId)).limit(1)
      : Promise.resolve([]),
    db.select().from(cryptoCheckoutSessions).where(eq(cryptoCheckoutSessions.orderId, orderId)),
  ])
  const address = addressRows[0]
  const session = sessionRows[0]
  return {
    id: row.id,
    number: row.number,
    email: row.email,
    status: row.status,
    paymentMethod: row.paymentMethod,
    totalCents: row.totalCents,
    currency: row.currency,
    locale: row.locale,
    discountCents: row.discountCents,
    promoCode: row.promoCode,
    placedAt: row.placedAt,
    itemCount: itemRows.reduce((sum, item) => sum + item.qty, 0),
    subtotalCents: row.subtotalCents,
    shippingCents: row.shippingCents,
    vatCents: row.vatCents,
    userId: row.userId,
    stripePaymentIntentId: row.stripePaymentIntentId,
    cryptoChargeId: row.cryptoChargeId,
    cryptoTxHash: row.cryptoTxHash,
    cryptoSession: session
      ? {
          id: session.id,
          chain: session.chain,
          amountCrypto: session.amountCrypto,
          amountEurCents: session.amountEurCents,
          rateEurPerUnit: session.rateEurPerUnit,
          walletAddress: session.walletAddress,
          status: session.status,
          expiresAt: session.expiresAt,
          telegramChatId: session.telegramChatId,
        }
      : null,
    shippingAddress: address
      ? {
          name: address.name,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          postal: address.postal,
          country: address.country,
        }
      : null,
    items: itemRows,
    shipments: shipmentRows,
  }
}

/**
 * The sellable inventory, thinnest stock first.
 *
 * Every directly purchasable SKU is listed, not only the ones that tripped
 * a threshold: an operator needs to see the stock of everything they sell,
 * and the threshold is a marker on a row rather than the filter for the list.
 */
export async function listInventoryVials(limit = 200) {
  const rows = await db
    .select({
      vialId: vials.id,
      sku: vials.sku,
      stockQty: vials.stockQty,
      lowStockThreshold: vials.lowStockThreshold,
      purchaseMode: vials.purchaseMode,
      priceCents: vials.priceCents,
    })
    .from(vials)
    .where(eq(vials.purchaseMode, "direct"))
    .orderBy(sql`${vials.stockQty} asc`)
    .limit(limit)
  return rows.map((row) => ({
    ...row,
    low:
      row.stockQty <= 0 ||
      (row.lowStockThreshold !== null && row.stockQty <= row.lowStockThreshold),
  }))
}

export interface OrderStatusCounts {
  status: string
  count: number
}

export async function countOrdersByStatus(): Promise<OrderStatusCounts[]> {
  const rows = await db
    .select({ status: orders.status, count: sql<number>`count(*)::int` })
    .from(orders)
    .groupBy(orders.status)
  return rows.map((row) => ({ status: row.status, count: Number(row.count ?? 0) }))
}
