import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { hasPublishedDocuments } from "@/lib/products/document-status"
import { formatSize } from "@/lib/utils/format"
import { z } from "zod"
import type { Tool } from "./registry"
const argsSchema = z
  .object({
    slugs: z.array(z.string().max(100)).min(2).max(4).optional(),
    skus: z.array(z.string().max(80)).min(2).max(4).optional(),
  })
  .strict()
  .refine((a) => !!a.slugs !== !!a.skus)
export const compareProductsTool: Tool = {
  definition: {
    name: "compareProducts",
    description:
      "Compare the customer's 2–4 exact selected SKUs or product slugs using current authoritative records. Ask for selections first. Preserve quantities/units and missing evidence; do not infer popularity or suitability.",
    parameters: {
      type: "object",
      properties: {
        slugs: { type: "array", items: { type: "string" } },
        skus: { type: "array", items: { type: "string" } },
      },
      required: [],
    },
  },
  async execute(raw, ctx) {
    const parsed = argsSchema.safeParse(raw)
    if (!parsed.success) return { content: { error: "invalid_selection", products: [] } }
    const catalog = await getStorefrontCatalogue()
    const requested = [...new Set(parsed.data.skus ?? parsed.data.slugs ?? [])]
    if (requested.length < 2) return { content: { error: "select_two", products: [] } }
    const rows = []
    const missing = []
    for (const selected of requested) {
      const p = catalog.find((p) =>
        parsed.data.skus ? p.vials.some((v) => v.sku === selected) : p.slug === selected,
      )
      if (!p) {
        missing.push(selected)
        continue
      }
      const variants = parsed.data.skus ? p.vials.filter((v) => v.sku === selected) : p.vials
      const tr = p.translations?.[ctx.locale] ?? p.defaultTranslation
      const direct = variants.filter(
        (v) => v.purchaseMode === "direct" && v.stockQty > 0 && v.priceCents > 0,
      )
      rows.push({
        slug: p.slug,
        name: tr.name,
        requestedSku: parsed.data.skus ? selected : null,
        category: p.category,
        purityPercent: variants[0]?.batch?.hplcPurity || null,
        vialSizes: variants.map((v) => formatSize(v, ctx.locale)),
        fromPriceCents: direct.length ? Math.min(...direct.map((v) => v.priceCents)) : null,
        variants: variants.map((v) => ({
          sku: v.sku,
          size: formatSize(v, ctx.locale),
          purchaseMode: v.purchaseMode,
          stockQty: v.stockQty,
          batchCode: v.batch?.code ?? null,
          documentsAvailable: hasPublishedDocuments(p, ctx.locale, v.sku),
        })),
        url: `/${ctx.locale}/shop/${p.slug}`,
      })
    }
    return { content: { locale: ctx.locale, products: rows, missing } }
  },
}
