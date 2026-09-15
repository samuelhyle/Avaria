/**
 * compareProducts — side-by-side comparison of 2–4 products.
 *
 * Returns a compact table suitable for direct rendering or for the model to
 * paraphrase into a Markdown table.
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { products } from "@/lib/products/data"

interface Args {
  slugs: string[]
}

export const compareProductsTool: Tool = {
  definition: {
    name: "compareProducts",
    description:
      "Compare 2–4 products by slug and return a compact table of name, category, purity, vial sizes, starting price, and latest batch HPLC / endotoxin. Use this whenever the user asks 'compare X vs Y'.",
    parameters: {
      type: "object",
      properties: {
        slugs: {
          type: "array",
          items: { type: "string" },
          description: "Array of 2 to 4 product slugs to compare.",
        },
      },
      required: ["slugs"],
    },
  },
  async execute(rawArgs, ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    const found = args.slugs
      .map((s) => products.find((p) => p.slug === s))
      .filter((p): p is (typeof products)[number] => Boolean(p))

    if (found.length === 0) {
      return { content: { error: "none_found", requested: args.slugs, products: [] } }
    }

    return {
      content: {
        locale: ctx.locale,
        products: found.map((p) => {
          const tr =
            ctx.locale === "en"
              ? p.defaultTranslation
              : ((
                  p.translations as
                    | Record<string, import("@/lib/products/types").ProductTranslation>
                    | undefined
                )?.[ctx.locale] ?? p.defaultTranslation)
          const minPrice = Math.min(...p.vials.map((v) => v.priceCents))
          return {
            slug: p.slug,
            name: tr.name,
            category: p.category,
            purityPercent: p.purityPercent ?? null,
            vialSizes: p.vials.map((v) => `${v.mg}mg`),
            fromPriceCents: Number.isFinite(minPrice) ? minPrice : null,
            url: `/${ctx.locale}/shop/${p.slug}`,
            latestBatch: p.latestBatch
              ? {
                  code: p.latestBatch.code,
                  hplcPurity: p.latestBatch.hplcPurity,
                  endotoxinEUPerMg: p.latestBatch.endotoxinEUPerMg,
                }
              : null,
          }
        }),
      },
    }
  },
}
