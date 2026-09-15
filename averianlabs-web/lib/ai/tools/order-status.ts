/**
 * getOrderStatus — auth-gated order lookup.
 *
 * Anonymous callers MUST provide both the order number and the email on the
 * order (we never expose an order by number alone — too easy to enumerate).
 * Signed-in callers are matched against the order's `userId` directly.
 */

import { orderItems, orders, productTranslations, products, shipments, vials } from "@/db/schema"
import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { db } from "@/lib/db"
import { and, eq, or } from "drizzle-orm"

interface Args {
  orderNumber?: string
  orderId?: string
  email?: string
}

export const getOrderStatusTool: Tool = {
  definition: {
    name: "getOrderStatus",
    description:
      "Look up an order's status, items, total, and tracking info. Anonymous callers must provide both order number and email. Signed-in users can use either order number or order id directly.",
    parameters: {
      type: "object",
      properties: {
        orderNumber: {
          type: "string",
          description:
            "Human-friendly order number, e.g. 'A-1042'. Required for anonymous callers along with email.",
        },
        orderId: {
          type: "string",
          description: "Internal UUID id of the order. Sign-in required.",
        },
        email: {
          type: "string",
          description: "Email address on the order. Required for anonymous callers.",
        },
      },
      required: [],
    },
  },
  async execute(rawArgs, ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    if (!ctx.auth && (!args.orderNumber || !args.email)) {
      return {
        content: {
          error: "missing_inputs",
          hint: "Anonymous callers need both an order number and the email on the order.",
        },
      }
    }

    const filters = []
    if (args.orderId) filters.push(eq(orders.id, args.orderId))
    if (args.orderNumber) filters.push(eq(orders.number, args.orderNumber))
    if (args.email && !ctx.auth) filters.push(eq(orders.email, args.email.toLowerCase()))

    if (filters.length === 0) {
      return { content: { error: "missing_inputs" } }
    }

    const rows = await db
      .select()
      .from(orders)
      .where(and(...filters, ctx.auth ? eq(orders.userId, ctx.auth.userId) : or(...filters)))
      .limit(1)

    const order = rows[0]
    if (!order) {
      return { content: { error: "not_found" } }
    }

    // Auth check: signed-in user must own the order.
    if (ctx.auth && order.userId !== ctx.auth.userId) {
      return { content: { error: "not_found" } }
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
          number: order.number,
          status: order.status,
          currency: order.currency,
          placedAt: order.placedAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          totals: {
            subtotalCents: order.subtotalCents,
            shippingCents: order.shippingCents,
            vatCents: order.vatCents,
            totalCents: order.totalCents,
          },
          items: itemRows.map((it) => ({
            sku: it.vialSku,
            mg: it.sizeMg,
            productSlug: it.productSlug,
            productName: it.productName ?? it.productSlug,
            qty: it.qty,
            unitPriceCents: it.unitPriceCents,
          })),
          shipments: shipmentRows.map((s) => ({
            id: s.id,
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
