/**
 * searchProducts — natural-language product search.
 *
 * Uses the static product catalog (`lib/products/data.ts`). Filters by
 * category, purity threshold, in-stock flag. Sorts by price ascending.
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"
import { products } from "@/lib/products/data"
import type { Product, ProductCategory } from "@/lib/products/types"

interface Args {
  q?: string
  category?: ProductCategory | "all"
  purityMin?: number
  inStockOnly?: boolean
  limit?: number
}

// Function words carry no signal and previously made natural-language queries
// ("Which peptide helps with tendon recovery research?") match nothing.
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "give",
  "good",
  "has",
  "have",
  "help",
  "helps",
  "how",
  "i",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "recommend",
  "research",
  "show",
  "some",
  "that",
  "the",
  "their",
  "to",
  "use",
  "used",
  "using",
  "we",
  "what",
  "which",
  "with",
  "you",
  "your",
])

// Research-goal vocabulary → catalog category, so "something for skin and
// collagen" finds the cosmetic category even when the words aren't in copy.
const GOAL_SYNONYMS: Record<string, string> = {
  skin: "cosmetic",
  collagen: "cosmetic",
  cosmetic: "cosmetic",
  wrinkle: "cosmetic",
  hair: "cosmetic",
  tendon: "recovery",
  joint: "recovery",
  injury: "recovery",
  healing: "recovery",
  muscle: "recovery",
  weight: "metabolic",
  fat: "metabolic",
  appetite: "metabolic",
  glucose: "metabolic",
  brain: "cognitive",
  memory: "cognitive",
  focus: "cognitive",
  cognitive: "cognitive",
  aging: "longevity",
  longevity: "longevity",
  telomere: "longevity",
}

function tokenize(q: string): string[] {
  const tokens = q
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  const expanded = new Set(tokens)
  for (const token of tokens) {
    const synonym = GOAL_SYNONYMS[token]
    if (synonym) expanded.add(synonym)
  }
  return Array.from(expanded)
}

function scoreProduct(p: Product, tokens: string[]): number {
  if (tokens.length === 0) return 0
  const name = p.defaultTranslation.name.toLowerCase()
  const haystack = [
    p.slug,
    p.defaultTranslation.name,
    p.defaultTranslation.tagline,
    p.defaultTranslation.description,
    p.translations?.en?.name ?? "",
    p.translations?.fi?.name ?? "",
    p.translations?.de?.name ?? "",
    p.translations?.sv?.name ?? "",
    p.translations?.nl?.name ?? "",
    p.casNumber ?? "",
    p.sequence ?? "",
    p.category,
  ]
    .join(" ")
    .toLowerCase()

  let score = 0
  for (const token of tokens) {
    if (name === token) score += 12
    else if (name.includes(token)) score += 6
    if (p.slug.includes(token)) score += 4
    if (p.category.includes(token)) score += 3
    if (p.casNumber?.toLowerCase().includes(token)) score += 6
    if (p.sequence?.toLowerCase().includes(token)) score += 6
    if (haystack.includes(token)) score += 2
  }
  return score
}

export const searchProductsTool: Tool = {
  definition: {
    name: "searchProducts",
    description:
      "Search the AverianLabs peptide catalog. Supports natural-language queries plus filters for category, purity, and stock. Returns up to `limit` results (default 5).",
    parameters: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description:
            "Free-text query — peptide name, slug, CAS number, sequence, or category keyword. Optional when filters alone are enough.",
        },
        category: {
          type: "string",
          enum: [
            "metabolic",
            "recovery",
            "cognitive",
            "longevity",
            "cosmetic",
            "blend",
            "supplies",
            "all",
          ],
          description: "Restrict to a category.",
        },
        purityMin: {
          type: "number",
          description: "Minimum HPLC purity in percent (e.g. 98 for ≥98%).",
        },
        inStockOnly: {
          type: "boolean",
          description: "Only return products with at least one in-stock vial.",
        },
        limit: { type: "number", description: "Max results to return. Default 5, max 10." },
      },
      required: [],
    },
  },
  async execute(rawArgs, ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 10)
    let results = products.filter(
      (p) =>
        !("status" in p) ||
        (p as Record<string, unknown>).status === "active" ||
        (p as Record<string, unknown>).status === undefined,
    )

    if (args.category && args.category !== "all") {
      results = results.filter((p) => p.category === args.category)
    }
    if (args.purityMin !== undefined) {
      const min = args.purityMin
      results = results.filter((p) => (p.purityPercent ?? 0) >= min)
    }
    if (args.inStockOnly) {
      results = results.filter((p) => p.vials.some((v) => v.stockQty > 0))
    }
    if (args.q) {
      const tokens = tokenize(args.q)
      if (tokens.length > 0) {
        results = results
          .map((p) => ({ p, score: scoreProduct(p, tokens) }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .map(({ p }) => p)
      }
    }

    results = results.slice(0, limit).map((p) => ({
      ...p,
      // strip translations — they're heavy and the model doesn't need them here
      translations: undefined,
    }))

    return {
      content: {
        locale: ctx.locale,
        count: results.length,
        results: results.map((p) => {
          const tr =
            ctx.locale === "en"
              ? p.defaultTranslation
              : (p.translations?.[ctx.locale as "fi" | "de" | "sv" | "nl"] ?? p.defaultTranslation)
          return {
            slug: p.slug,
            category: p.category,
            name: tr.name,
            tagline: tr.tagline,
            purityPercent: p.purityPercent ?? null,
            casNumber: p.casNumber ?? null,
            vials: p.vials.map((v) => ({
              sku: v.sku,
              mg: v.mg,
              priceCents: v.priceCents,
              stockQty: v.stockQty,
            })),
            url: `/${ctx.locale}/shop/${p.slug}`,
          }
        }),
      },
    }
  },
}
