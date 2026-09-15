/**
 * trackShipment — narrow focus on shipment status + tracking.
 *
 * Companion to getOrderStatus — same ownership rules, but the response is
 * just the carrier / tracking-number / ETA story so the model can answer
 * "where's my package?" in one tool call.
 */

import { orders, shipments } from "@/db/schema"
import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { db } from "@/lib/db"
import { and, eq, or } from "drizzle-orm"

interface Args {
  orderNumber?: string
  orderId?: string
  email?: string
}

const STATUS_LOCALES: Record<string, Record<string, string>> = {
  en: {
    label_created: "Label created",
    picked_up: "Picked up",
    in_transit: "In transit",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    exception: "Exception",
    unknown: "Unknown",
  },
  fi: {
    label_created: "Lippu luotu",
    picked_up: "Noudettu",
    in_transit: "Matkalla",
    out_for_delivery: "Jaossa",
    delivered: "Toimitettu",
    exception: "Poikkeama",
    unknown: "Tuntematon",
  },
  de: {
    label_created: "Etikett erstellt",
    picked_up: "Abgeholt",
    in_transit: "In Zustellung",
    out_for_delivery: "In der Zustellung",
    delivered: "Zugestellt",
    exception: "Problem",
    unknown: "Unbekannt",
  },
  sv: {
    label_created: "Etikett skapad",
    picked_up: "Hämtad",
    in_transit: "Under transport",
    out_for_delivery: "På utdelning",
    delivered: "Levererad",
    exception: "Avvikelse",
    unknown: "Okänd",
  },
  nl: {
    label_created: "Label aangemaakt",
    picked_up: "Opgehaald",
    in_transit: "Onderweg",
    out_for_delivery: "Bezorgd vandaag",
    delivered: "Bezorgd",
    exception: "Uitzondering",
    unknown: "Onbekend",
  },
}

export const trackShipmentTool: Tool = {
  definition: {
    name: "trackShipment",
    description:
      "Return tracking information for the most recent shipment on an order — carrier, service, tracking number, status, and ETA. Same auth rules as getOrderStatus.",
    parameters: {
      type: "object",
      properties: {
        orderNumber: { type: "string", description: "Human-friendly order number." },
        orderId: { type: "string", description: "Internal UUID id of the order." },
        email: { type: "string", description: "Email on the order (anonymous callers)." },
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

    if (filters.length === 0) return { content: { error: "missing_inputs" } }

    const orderRows = await db
      .select()
      .from(orders)
      .where(and(...filters, ctx.auth ? eq(orders.userId, ctx.auth.userId) : or(...filters)))
      .limit(1)

    const order = orderRows[0]
    if (!order) return { content: { error: "not_found" } }
    if (ctx.auth && order.userId !== ctx.auth.userId) {
      return { content: { error: "not_found" } }
    }

    const shipmentRows = await db
      .select()
      .from(shipments)
      .where(eq(shipments.orderId, order.id))
      .orderBy(shipments.shippedAt)

    const labels = STATUS_LOCALES[ctx.locale] ?? STATUS_LOCALES.en ?? {}
    const last = shipmentRows[shipmentRows.length - 1]

    return {
      content: {
        locale: ctx.locale,
        orderNumber: order.number,
        shipments: shipmentRows.map((s) => ({
          carrier: s.carrier,
          service: s.service,
          trackingNumber: s.trackingNumber,
          status: s.status,
          statusLabel: labels[s.status] ?? labels.unknown ?? s.status,
          shippedAt: s.shippedAt?.toISOString() ?? null,
          deliveredAt: s.deliveredAt?.toISOString() ?? null,
        })),
        mostRecent: last
          ? {
              carrier: last.carrier,
              trackingNumber: last.trackingNumber,
              statusLabel: labels[last.status] ?? labels.unknown ?? last.status,
              delivered: !!last.deliveredAt,
            }
          : null,
      },
    }
  },
}
