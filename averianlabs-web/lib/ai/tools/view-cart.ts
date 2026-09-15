/**
 * viewCart — return the current cart snapshot.
 *
 * The cart lives client-side (Zustand + localStorage). On the server we read
 * the snapshot from the request body — the client always sends it on every
 * request so the model can reason about it.
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"

export const viewCartTool: Tool = {
  definition: {
    name: "viewCart",
    description:
      "Return the current cart contents: line items with SKU, name, vial size, qty, and unit price. Also returns subtotal in cents.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  async execute(_args, ctx): Promise<ToolResult> {
    const subtotal = ctx.cart.reduce((s, i) => s + i.unitPriceCents * i.qty, 0)
    const count = ctx.cart.reduce((s, i) => s + i.qty, 0)
    return {
      content: {
        locale: ctx.locale,
        count,
        subtotalCents: subtotal,
        items: ctx.cart,
      },
    }
  },
}
