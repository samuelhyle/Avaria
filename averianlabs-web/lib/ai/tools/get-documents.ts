import { listDocumentsForProductSlug, resolveDocumentUrl } from "@/lib/documents/service"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import type { Tool } from "./registry"
export const getDocumentsTool: Tool = {
  definition: {
    name: "getDocuments",
    description:
      "Find currently published, publicly accessible original documents for an exact product slug or SKU. Return actual title, version, date, SKU/batch context and link; an empty result does not imply approval or PASS.",
    parameters: {
      type: "object",
      properties: { slug: { type: "string" }, sku: { type: "string" } },
      required: [],
    },
  },
  async execute(raw, ctx) {
    const args = raw as { slug?: unknown; sku?: unknown }
    if (!args || (typeof args.slug !== "string" && typeof args.sku !== "string"))
      return { content: { error: "missing_product" } }
    const product = (await getStorefrontCatalogue()).find(
      (p) => p.slug === args.slug || p.vials.some((v) => v.sku === args.sku),
    )
    if (!product) return { content: { error: "not_found", documents: [] } }
    const docs = await listDocumentsForProductSlug(product.slug, ctx.locale)
    const result = []
    for (const doc of docs) {
      if (typeof args.sku === "string" && doc.batchId && doc.batchSku !== args.sku) continue
      const url = await resolveDocumentUrl(doc)
      if (url)
        result.push({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          version: doc.version,
          publishedAt: doc.publishedAt.toISOString(),
          batchCode: doc.batchCode,
          batchStatus: doc.batchStatus ?? null,
          sku: doc.batchSku ?? null,
          url,
        })
    }
    return {
      content: {
        slug: product.slug,
        source: "published_document_registry",
        documents: result,
        notice:
          ctx.locale === "fi"
            ? "Arvioi alkuperäiset menetelmät ja tulokset. Linkki ei ole yleinen hyväksyntä."
            : "Assess the original methods and results. A link is not a blanket approval.",
      },
    }
  },
}
