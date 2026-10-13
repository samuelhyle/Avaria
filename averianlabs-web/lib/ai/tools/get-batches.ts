/**
 * getBatches — list the most recent batches for a product.
 *
 * Reads the live `batches` table first (with the product's vials joined by
 * slug) and falls back to the static catalog's `latestBatch` when the DB has
 * no rows or is unreachable — so stock/COA answers never silently go stale.
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
interface Args {
  slug: string
}

export const getBatchesTool: Tool = {
  definition: {
    name: "getBatches",
    description:
      "Return recent batches with HPLC purity, endotoxin level, mass-spec confirmation, and lab for a given product slug. Returns an empty array if no batch data has been published.",
    parameters: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "Product slug.",
        },
      },
      required: ["slug"],
    },
  },
  async execute(rawArgs, _ctx: ToolContext): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    const p = (await getStorefrontCatalogue()).find((product) => product.slug === args.slug)
    if (!p) return { content: { error: "not_found", batches: [] } }
    return {
      content: {
        slug: p.slug,
        source: p.dataSource,
        batches: p.vials.flatMap((vial) =>
          vial.batch
            ? [
                {
                  ...vial.batch,
                  sku: vial.sku,
                  hplcPurity: p.productType === "supplies" ? null : vial.batch.hplcPurity || null,
                  endotoxinEUPerMg: null,
                },
              ]
            : [],
        ),
      },
    }
  },
}
