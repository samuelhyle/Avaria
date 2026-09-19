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
    // Defensive validation — `slugs` may not be an array if the model sends
    // a string or skips the field entirely.
    const slugs = Array.isArray(args.slugs) ? args.slugs : []
    const safeSlugs = slugs.filter((s): s is string => typeof s === "string").slice(0, 4)
    if (safeSlugs.length < 2) {
      return {
        content: { error: "invalid_inputs", hint: "Provide 2 to 4 product slugs." },
      }
    }

    const found = safeSlugs
      .map((s) => products.find((p) => p.slug === s))
      .filter((p): p is (typeof products)[number] => Boolean(p))

    if (found.length === 0) {
      return { content: { error: "none_found", requested: safeSlugs, products: [] } }
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
