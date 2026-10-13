import { batches, categories, documents, products, productTranslations, vials } from "@/db/schema"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { and, eq, gt, inArray, isNotNull, or } from "drizzle-orm"
import { cache } from "react"
import { products as referenceProducts } from "./data"
import type { Batch, Locale, Product, PurchaseMode, SizeUnit } from "./types"

const neutral = {
  en: "Laboratory research material. Review the product-specific documentation before use.",
  fi: "Materiaali laboratoriotutkimukseen. Tarkista tuotekohtaiset asiakirjat ennen käyttöä.",
}

export function referenceCatalogue(): Product[] {
  return referenceProducts.map((product) => ({
    ...product,
    dataSource: "reference",
    specificationsVerified: false,
    productType: product.category === "supplies" ? "supplies" : product.slug === "nad-plus" ? "reagent" : "peptide",
    casNumber: undefined,
    molecularFormula: undefined,
    molecularWeight: undefined,
    sequence: undefined,
    storageTemp: "",
    purityPercent: undefined,
    latestBatch: undefined,
    defaultTranslation: { ...product.defaultTranslation, tagline: neutral.en, description: neutral.en },
    translations: { ...product.translations, fi: { name: product.translations?.fi?.name ?? product.defaultTranslation.name, tagline: neutral.fi, description: neutral.fi } },
    vials: product.vials.map((vial) => ({ ...vial, stockQty: 0, priceCents: 0, compareAtCents: undefined, purchaseMode: "quotation", contactOnly: true })),
  }))
}

export function defaultVial(product: Product) {
  return [...product.vials].sort((a, b) => {
    const available = (v: typeof a) => v.purchaseMode === "direct" && v.stockQty > 0
    if (available(a) !== available(b)) return available(a) ? -1 : 1
    return a.priceCents - b.priceCents
  })[0] ?? product.vials[0]!
}

/** Cached within a request. Database inventory is never replaced with saleable sample stock. */
export const getStorefrontCatalogue = cache(async (): Promise<Product[]> => {
  const references = referenceCatalogue()
  if (process.env.BUILD_MODE === "demo" || !process.env.DATABASE_URL) return references
  try {
    const [rows, vialRows, translations, batchRows, reportRows] = await Promise.all([
      db.select({ product: products, category: categories.slug }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(inArray(products.status, ["active", "draft"])),
      db.select().from(vials),
      db.select().from(productTranslations),
      db.select().from(batches).where(and(eq(batches.verificationStatus, "released"), isNotNull(batches.reviewedBy), isNotNull(batches.reviewedAt), gt(batches.expiresAt, new Date()))),
      db.select({ batchId: documents.batchId }).from(documents).where(and(eq(documents.type, "coa"), eq(documents.requiresLogin, false), or(isNotNull(documents.fileR2Key), isNotNull(documents.externalUrl)))),
    ])
    if (!rows.length) return references
    const result: Product[] = []
    for (const { product: row, category } of rows) {
      const reference = references.find((p) => p.slug === row.slug)
      const specs = row.specJson as Record<string, unknown>
      const specificationsVerified = specs.verified === true && typeof specs.evidenceRef === "string" && specs.evidenceRef.length > 0
      const localized = translations.filter((t) => t.productId === row.id)
      const fallbackName = localized.find((t) => t.locale === "en")?.name ?? reference?.defaultTranslation.name ?? row.slug
      const vialsForProduct = vialRows.filter((v) => v.productId === row.id).map((vial) => {
        const batch = batchRows.filter((b) => b.vialId === vial.id && reportRows.some((doc) => doc.batchId === b.id)).sort((a, b) => b.manufacturedAt.getTime() - a.manufacturedAt.getTime())[0]
        const batchRecord: Batch | undefined = batch ? { id: batch.id, code: batch.code, manufacturedAt: batch.manufacturedAt.toISOString(), expiresAt: batch.expiresAt.toISOString(), hplcPurity: batch.hplcPurity, endotoxinEUPerMg: batch.endotoxinEUPerMg, msConfirmed: batch.msConfirmed, lab: batch.lab } : undefined
        const mode: PurchaseMode = vial.purchaseMode === "quotation" ? "quotation" : row.status === "active" && specificationsVerified && batch && vial.priceCents !== null && vial.priceCents > 0 ? (vial.purchaseMode as PurchaseMode) : "unavailable"
        return { mg: vial.sizeMg ?? vial.sizeValue, sizeValue: vial.sizeValue, sizeUnit: vial.sizeUnit as SizeUnit, sku: vial.sku, priceCents: vial.priceCents ?? 0, stockQty: mode === "direct" ? vial.stockQty : 0, lowStockThreshold: vial.lowStockThreshold, purchaseMode: mode, contactOnly: mode === "quotation", batch: batchRecord }
      })
      if (!vialsForProduct.length) continue
      const product: Product = { slug: row.slug, category: (category ?? reference?.category ?? "supplies") as Product["category"], hue: row.hue, dataSource: "database", productType: row.productType as Product["productType"], specificationsVerified, createdAt: row.createdAt.toISOString(), casNumber: specificationsVerified ? row.casNumber ?? undefined : undefined, molecularFormula: specificationsVerified ? row.molecularFormula ?? undefined : undefined, molecularWeight: specificationsVerified ? row.molecularWeight ?? undefined : undefined, sequence: specificationsVerified && row.productType === "peptide" ? row.sequence ?? undefined : undefined, storageTemp: specificationsVerified ? row.storageTemp ?? "" : "", vials: vialsForProduct, defaultTranslation: { name: fallbackName, tagline: specificationsVerified ? localized.find((t) => t.locale === "en")?.tagline ?? neutral.en : neutral.en, description: specificationsVerified ? localized.find((t) => t.locale === "en")?.description ?? neutral.en : neutral.en }, translations: {} }
      for (const locale of ["fi", "de", "sv", "nl"] as Locale[]) {
        const translation = localized.find((t) => t.locale === locale)
        const fallback = reference?.translations?.[locale]
        product.translations![locale] = { name: translation?.name ?? fallback?.name ?? fallbackName, tagline: specificationsVerified && translation?.tagline ? translation.tagline : locale === "fi" ? neutral.fi : neutral.en, description: specificationsVerified && translation?.description ? translation.description : locale === "fi" ? neutral.fi : neutral.en }
      }
      product.latestBatch = defaultVial(product).batch
      product.purityPercent = row.productType !== "supplies" && product.latestBatch?.hplcPurity ? product.latestBatch.hplcPurity : undefined
      result.push(product)
    }
    return result
  } catch (error) {
    logger.warn("[catalogue] database unavailable; reference catalogue is not purchasable", error instanceof Error ? error.message : "unknown error")
    return references
  }
})
