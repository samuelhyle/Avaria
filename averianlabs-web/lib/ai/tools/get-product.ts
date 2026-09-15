/**
 * getProduct — fetch a single product by slug.
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { products } from "@/lib/products/data"

interface Args {
  slug: string
}

export const getProductTool: Tool = {
  definition: {
    name: "getProduct",
    description:
      "Return full details for a single product by slug, including vials, COA references, and localized copy. Returns null if the slug is unknown.",
    parameters: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "Product slug, e.g. 'bpc-157', 'tirzepatide', 'bac-water'.",
        },
      },
      required: ["slug"],
    },
  },
  async execute(rawArgs, ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    const p = products.find((x) => x.slug === args.slug)
    if (!p) return { content: { error: "not_found", slug: args.slug } }
    const tr =
      ctx.locale === "en"
        ? p.defaultTranslation
        : ((
            p.translations as
              | Record<string, import("@/lib/products/types").ProductTranslation>
              | undefined
          )?.[ctx.locale] ?? p.defaultTranslation)
    return {
      content: {
        slug: p.slug,
        category: p.category,
        name: tr.name,
        tagline: tr.tagline,
        description: tr.description,
        casNumber: p.casNumber ?? null,
        molecularFormula: p.molecularFormula ?? null,
        molecularWeight: p.molecularWeight ?? null,
        sequence: p.sequence ?? null,
        storageTemp: p.storageTemp,
        purityPercent: p.purityPercent ?? null,
        vials: p.vials,
        latestBatch: p.latestBatch ?? null,
        url: `/${ctx.locale}/shop/${p.slug}`,
      },
    }
  },
}
