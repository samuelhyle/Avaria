/**
 * adminLookupOrder — role-gated full order detail.
 *
 * Unlike `getOrderStatus` (which respects ownership), this returns any order
 * the admin asks for — admins need to see every order for support work.
 */

import {
  orderItems,
  orders,
  productTranslations,
  products,
  shipments,
  users,
  vials,
} from "@/db/schema"
import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { db } from "@/lib/db"
import { and, eq } from "drizzle-orm"

interface Args {
  orderNumber?: string
  orderId?: string
}

export const adminLookupOrderTool: Tool = {
  definition: {
    name: "adminLookupOrder",
    description:
      "Admin-only. Return full order details including customer info, items, shipments, and any internal notes. Bypasses the email-ownership check that the customer-facing getOrderStatus enforces.",
    parameters: {
      type: "object",
      properties: {
        orderNumber: { type: "string", description: "Human-friendly order number, e.g. 'A-1042'." },
        orderId: { type: "string", description: "Internal UUID id." },
      },
      required: [],
    },
  },
  requiresAdmin: true,
  async execute(rawArgs, ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    if (!args.orderNumber && !args.orderId) {
      return { content: { error: "missing_inputs" } }
    }

    const filters = []
    if (args.orderId) filters.push(eq(orders.id, args.orderId))
    if (args.orderNumber) filters.push(eq(orders.number, args.orderNumber))

    const rows = await db
      .select()
      .from(orders)
      .where(and(...filters))
      .limit(1)
    const order = rows[0]
    if (!order) return { content: { error: "not_found" } }

    let customer: { id: string; email: string; name: string | null } | null = null
    if (order.userId) {
      const u = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1)
      customer = u[0] ?? null
    }

    const itemRows = await db
      .select({
        qty: orderItems.qty,
        unitPriceCents: orderItems.unitPriceCents,
        vialSku: vials.sku,
        sizeMg: vials.sizeMg,
        productSlug: products.slug,
        productName: productTranslations.name,
      })
      .from(orderItems)
      .innerJoin(vials, eq(vials.id, orderItems.vialId))
      .innerJoin(products, eq(products.id, vials.productId))
      .leftJoin(
        productTranslations,
        and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "en")),
      )
      .where(eq(orderItems.orderId, order.id))

    const shipmentRows = await db.select().from(shipments).where(eq(shipments.orderId, order.id))

    return {
      content: {
        locale: ctx.locale,
        order: {
          id: order.id,
          number: order.number,
          status: order.status,
          email: order.email,
          placedAt: order.placedAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          totals: {
            subtotalCents: order.subtotalCents,
            shippingCents: order.shippingCents,
            vatCents: order.vatCents,
            totalCents: order.totalCents,
          },
          stripePaymentIntentId: order.stripePaymentIntentId ? "[REDACTED]" : null,
          cryptoTxHash: order.cryptoTxHash ? "[REDACTED]" : null,
          customer,
          items: itemRows.map((it) => ({
            sku: it.vialSku,
            mg: it.sizeMg,
            productSlug: it.productSlug,
            productName: it.productName ?? it.productSlug,
            qty: it.qty,
            unitPriceCents: it.unitPriceCents,
          })),
          shipments: shipmentRows.map((s) => ({
            carrier: s.carrier,
            service: s.service,
            trackingNumber: s.trackingNumber,
            status: s.status,
            shippedAt: s.shippedAt?.toISOString() ?? null,
            deliveredAt: s.deliveredAt?.toISOString() ?? null,
          })),
        },
      },
    }
  },
}
