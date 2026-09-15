/**
 * addToCart — proposed-action tool.
 *
 * Server-side: looks up the vial in the catalog, validates stock, and emits a
 * `proposedAction` payload that the UI will render as a confirmation card.
 * Does NOT mutate the cart — the client applies the action after the user
 * confirms.
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { products } from "@/lib/products/data"

interface Args {
  slug: string
  mg: number
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
        mg: { type: "number", description: "Vial size in mg." },
        qty: { type: "number", description: "Quantity (default 1, max 99)." },
      },
      required: ["slug", "mg"],
    },
  },
  async execute(rawArgs, ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    const qty = Math.min(Math.max(args.qty ?? 1, 1), 99)
    const product = products.find((p) => p.slug === args.slug)
    if (!product) {
      return { content: { error: "not_found", slug: args.slug } }
    }
    const vial = product.vials.find((v) => v.mg === args.mg)
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
    if (vial.stockQty < qty) {
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

    const confirmMessage: Record<string, (name: string, qty: number, mg: number) => string> = {
      en: (n, q, m) => `Add ${q}× ${n} ${m}mg to the cart?`,
      fi: (n, q, m) => `Lisätäänkö ${q}× ${n} ${m}mg ostoskoriin?`,
      de: (n, q, m) => `${q}× ${n} ${m}mg in den Warenkorb legen?`,
      sv: (n, q, m) => `Lägga till ${q}× ${n} ${m}mg i varukorgen?`,
      nl: (n, q, m) => `${q}× ${n} ${m}mg aan winkelwagen toevoegen?`,
    }
    const enFormat = (n: string, q: number, m: number) => `Add ${q}× ${n} ${m}mg to the cart?`
    const format = confirmMessage[ctx.locale as keyof typeof confirmMessage] ?? enFormat

    return {
      content: {
        ok: true,
        message: format(tr.name, qty, vial.mg),
      },
      proposedAction: {
        kind: "add_to_cart",
        sku: vial.sku,
        productSlug: product.slug,
        productName: tr.name,
        mg: vial.mg,
        qty,
        unitPriceCents: vial.priceCents,
      },
    }
  },
}
