/**
 * addToCart — proposed-action tool.
 *
 * Server-side: looks up the vial in the catalog, validates stock, and emits a
 * `proposedAction` payload that the UI will render as a confirmation card.
 * Does NOT mutate the cart — the client applies the action after the user
 * confirms.
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { formatSize } from "@/lib/utils/format"

interface Args {
  slug: string
  sku: string
  mg?: number
  qty?: number
}

export const addToCartTool: Tool = {
  definition: {
    name: "addToCart",
    description:
      "Propose adding a product vial to the user's cart. The server emits a `proposedAction` payload; the UI shows a confirmation card and only applies on user approval. Always emit a proposal — never assume.",
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Product slug." },
        sku: { type: "string", description: "Exact SKU from the current product lookup." },
        qty: { type: "number", description: "Quantity (default 1, max 20)." },
      },
      required: ["slug", "sku"],
    },
  },
  async execute(rawArgs, ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    const products = await getStorefrontCatalogue()
    const qty = args.qty ?? 1
    if (!Number.isInteger(qty) || qty < 1 || qty > 20)
      return { content: { error: "invalid_quantity" } }
    const product = products.find((p) => p.slug === args.slug)
    if (!product) {
      return { content: { error: "not_found", slug: args.slug } }
    }
    const vial = product.vials.find((v) => v.sku === args.sku)
    if (!vial) {
      return {
        content: {
          error: "vial_size_unavailable",
          slug: args.slug,
          mg: args.mg,
          available: product.vials.map((v) => v.mg),
        },
      }
    }
    if (vial.purchaseMode !== "direct" || vial.stockQty < qty) {
      return {
        content: {
          error: "insufficient_stock",
          slug: args.slug,
          mg: args.mg,
          requested: qty,
          available: vial.stockQty,
        },
      }
    }

    const tr =
      ctx.locale === "en"
        ? product.defaultTranslation
        : ((
            product.translations as
              | Record<string, import("@/lib/products/types").ProductTranslation>
              | undefined
          )?.[ctx.locale] ?? product.defaultTranslation)

    return {
      content: {
        ok: true,
        message:
          ctx.locale === "fi"
            ? `Lisätäänkö ${qty} × ${tr.name} ${formatSize(vial, ctx.locale)} ostoskoriin?`
            : `Add ${qty} × ${tr.name} ${formatSize(vial, ctx.locale)} to the cart?`,
      },
      proposedAction: {
        kind: "add_to_cart",
        sku: vial.sku,
        productSlug: product.slug,
        productName: tr.name,
        mg: vial.mg,
        sizeValue: vial.sizeValue,
        sizeUnit: vial.sizeUnit,
        qty,
        unitPriceCents: vial.priceCents,
      },
    }
  },
}
