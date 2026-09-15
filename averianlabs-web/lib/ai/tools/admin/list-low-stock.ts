/**
 * adminListLowStock — role-gated inventory check.
 *
 * Returns vials whose stock has dropped below the per-product threshold or
 * is sold out. Useful for "what should I re-order?" queries from the admin
 * copilot.
 */

import { productTranslations, products, vials } from "@/db/schema"
import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { db } from "@/lib/db"
import { and, eq, lt, lte, or } from "drizzle-orm"

export const adminListLowStockTool: Tool = {
  definition: {
    name: "adminListLowStock",
    description:
      "Admin-only. List SKUs that are at or below their low-stock threshold, or out of stock. Use this when an admin asks about inventory health or what to reorder.",
    parameters: {
      type: "object",
      properties: {
        threshold: {
          type: "number",
          description:
            "Override threshold — return vials below this absolute stock level (default: per-vial lowStockThreshold).",
        },
        limit: {
          type: "number",
          description: "Max rows to return (default 25).",
        },
      },
      required: [],
    },
  },
  requiresAdmin: true,
  async execute(rawArgs, _ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as { threshold?: number; limit?: number }
    const limit = Math.min(Math.max(args.limit ?? 25, 1), 100)
    const override = args.threshold

    const rows = await db
      .select({
        sku: vials.sku,
        sizeMg: vials.sizeMg,
        stockQty: vials.stockQty,
        lowStockThreshold: vials.lowStockThreshold,
        priceCents: vials.priceCents,
        productSlug: products.slug,
        productName: productTranslations.name,
        productLocale: productTranslations.locale,
      })
      .from(vials)
      .innerJoin(products, eq(products.id, vials.productId))
      .leftJoin(
        productTranslations,
        and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, "en")),
      )
      .where(
        override !== undefined
          ? lte(vials.stockQty, override)
          : or(lt(vials.stockQty, vials.lowStockThreshold), eq(vials.stockQty, 0)),
      )
      .limit(limit)

    return {
      content: {
        count: rows.length,
        rows: rows.map((r) => ({
          sku: r.sku,
          productSlug: r.productSlug,
          productName: r.productName ?? r.productSlug,
          mg: r.sizeMg,
          stockQty: r.stockQty,
          lowStockThreshold: r.lowStockThreshold,
          priceCents: r.priceCents,
        })),
      },
    }
  },
}
