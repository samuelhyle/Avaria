import { batches, categories, documents, productTranslations, products, vials } from "@/db/schema"
import { isCheckoutTestProduct } from "@/lib/checkout/test-product"
import { db } from "@/lib/db"
import { publicDocumentUrl } from "@/lib/documents/availability"
import { DOCUMENT_TYPES } from "@/lib/documents/constants"
import { logger } from "@/lib/logger"
import { and, eq, gt, inArray, isNotNull, lte, sql } from "drizzle-orm"
import { unstable_cache } from "next/cache"
import { cache } from "react"
import { products as referenceProducts } from "./data"
import { defaultVial } from "./selection"
import type { Batch, Locale, Product, PurchaseMode, SizeUnit } from "./types"

const neutral = {
  en: "Laboratory research material. Review the product-specific documentation before use.",
  fi: "Materiaali laboratoriotutkimukseen. Tarkista tuotekohtaiset asiakirjat ennen käyttöä.",
  sv: "Material för laboratorieforskning. Kontrollera produktens dokumentation före användning.",
  ru: "Материал для лабораторных исследований. Проверьте документацию продукта перед применением.",
}

/** Every locale the storefront serves. */
const STOREFRONT_LOCALES = ["en", "fi", "sv", "ru"] as const

export function referenceCatalogue(): Product[] {
  return referenceProducts.map((product) => ({
    ...product,
    dataSource: "reference",
    specificationsVerified: false,
    productType:
      product.category === "supplies"
        ? "supplies"
        : product.slug === "nad-plus"
          ? "reagent"
          : "peptide",
    casNumber: undefined,
    molecularFormula: undefined,
    molecularWeight: undefined,
    sequence: undefined,
    storageTemp: "",
    purityPercent: undefined,
    latestBatch: undefined,
    defaultTranslation: {
      ...product.defaultTranslation,
      tagline: neutral.en,
      description: neutral.en,
    },
    translations: {
      ...product.translations,
      en: {
        name: product.defaultTranslation.name,
        tagline: neutral.en,
        description: neutral.en,
      },
      fi: {
        name: product.translations?.fi?.name ?? product.defaultTranslation.name,
        tagline: neutral.fi,
        description: neutral.fi,
      },
    },
    vials: product.vials.map((vial) => ({
      ...vial,
      stockQty: 0,
      priceCents: 0,
      compareAtCents: undefined,
      purchaseMode: "quotation",
      contactOnly: true,
    })),
  }))
}

/**
 * The order variants are presented in: mass, then volume, then count.
 * Within a unit the smaller size comes first.
 */
const VIAL_UNIT_ORDER: Record<string, number> = {
  mcg: 0,
  mg: 1,
  g: 2,
  uL: 3,
  mL: 4,
  vial: 5,
}

function compareVials(
  a: { sizeUnit: string; sizeValue: number; sku: string },
  b: { sizeUnit: string; sizeValue: number; sku: string },
): number {
  const unitA = VIAL_UNIT_ORDER[a.sizeUnit] ?? 99
  const unitB = VIAL_UNIT_ORDER[b.sizeUnit] ?? 99
  if (unitA !== unitB) return unitA - unitB
  if (a.sizeValue !== b.sizeValue) return a.sizeValue - b.sizeValue
  return a.sku.localeCompare(b.sku)
}

/**
 * The catalogue, cached for a short window.
 *
 * Every page rendered the full catalogue from the database: seven queries
 * plus a per-product scan of the batch, document and vial tables. The
 * catalogue is the same for every visitor and changes only when stock or
 * pricing changes, so it is cached for a minute and revalidated by tag.
 *
 * Order creation never trusts this cache — `lib/orders/quote.ts` re-reads the
 * database and re-checks stock and price before an order is accepted.
 */
const loadCatalogue = unstable_cache(
  async (): Promise<Product[]> => buildCatalogue(),
  ["storefront-catalogue"],
  { revalidate: 60, tags: ["storefront-catalogue"] },
)

/** Cached within a request. Database inventory is never replaced with saleable sample stock. */
export const getStorefrontCatalogue = cache(async (): Promise<Product[]> => {
  const references = referenceCatalogue()
  if (process.env.BUILD_MODE === "demo" || !process.env.DATABASE_URL) return references
  try {
    return await loadCatalogue()
  } catch (error) {
    // `unstable_cache` needs a request context. Scripts and one-off tooling
    // call this outside one, so the catalogue is read directly rather than
    // silently falling back to the non-purchasable reference list.
    try {
      return await buildCatalogue()
    } catch {
      logger.warn(
        "[catalogue] database unavailable; reference catalogue is not purchasable",
        error instanceof Error ? error.message : "unknown error",
      )
      return references
    }
  }
})

async function buildCatalogue(): Promise<Product[]> {
  const references = referenceCatalogue()
  try {
    const [rows, vialRows, translations, batchRows, reportRows, publicDocs, batchLinks] =
      await Promise.all([
        db
          .select({ product: products, category: categories.slug })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(inArray(products.status, ["active", "draft"])),
        db.select().from(vials),
        db.select().from(productTranslations),
        db
          .select()
          .from(batches)
          .where(
            and(
              eq(batches.verificationStatus, "released"),
              isNotNull(batches.reviewedBy),
              isNotNull(batches.reviewedAt),
              gt(batches.expiresAt, new Date()),
            ),
          ),
        db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.type, "coa"),
              eq(documents.requiresLogin, false),
              lte(documents.publishedAt, new Date()),
              sql`ARRAY['en','fi']::text[] <@ ${documents.displayLocales}`,
            ),
          ),
        db
          .select()
          .from(documents)
          .where(and(eq(documents.requiresLogin, false), lte(documents.publishedAt, new Date()))),
        db.select({ id: batches.id, vialId: batches.vialId }).from(batches),
      ])
    if (!rows.length) return references
    const result: Product[] = []
    for (const { product: row, category } of rows) {
      const reference = references.find((p) => p.slug === row.slug)
      const specs = row.specJson as Record<string, unknown>
      const checkoutTest = vialRows.some(
        (vial) => vial.productId === row.id && isCheckoutTestProduct(row, vial),
      )
      const specificationsVerified =
        specs.verified === true &&
        typeof specs.evidenceRef === "string" &&
        specs.evidenceRef.length > 0
      const localized = translations.filter((t) => t.productId === row.id)
      const fallbackName =
        localized.find((t) => t.locale === "en")?.name ??
        reference?.defaultTranslation.name ??
        row.slug
      const vialsForProduct = vialRows
        .filter((v) => v.productId === row.id)
        // The query has no ORDER BY, so the rows arrive in whatever order the
        // plan produced. That put "10 mg / 5 mg" on the catalogue card and let
        // the wrong variant be preselected on the product page. Sort by unit
        // and then by size so a product always reads smallest first.
        .sort(compareVials)
        .map((vial) => {
          const batch = batchRows
            .filter(
              (b) =>
                b.id === (vial.activeBatchId ?? row.activeBatchId) &&
                b.vialId === vial.id &&
                reportRows.some((doc) => doc.batchId === b.id && publicDocumentUrl(doc)),
            )
            .sort((a, b) => b.manufacturedAt.getTime() - a.manufacturedAt.getTime())[0]
          const batchRecord: Batch | undefined = batch
            ? {
                id: batch.id,
                code: batch.code,
                manufacturedAt: batch.manufacturedAt.toISOString(),
                expiresAt: batch.expiresAt.toISOString(),
                hplcPurity: batch.hplcPurity,
                endotoxinEUPerMg: batch.endotoxinEUPerMg,
                msConfirmed: batch.msConfirmed,
                lab: batch.lab,
              }
            : undefined
          const mode: PurchaseMode =
            vial.purchaseMode === "quotation"
              ? "quotation"
              : row.status === "active" &&
                  ((specificationsVerified && batch) || isCheckoutTestProduct(row, vial)) &&
                  vial.priceCents !== null &&
                  vial.priceCents > 0
                ? (vial.purchaseMode as PurchaseMode)
                : "unavailable"
          return {
            mg: vial.sizeMg ?? vial.sizeValue,
            sizeValue: vial.sizeValue,
            sizeUnit: vial.sizeUnit as SizeUnit,
            sku: vial.sku,
            priceCents: mode === "direct" ? (vial.priceCents ?? 0) : 0,
            stockQty: mode === "direct" ? vial.stockQty : 0,
            lowStockThreshold: vial.lowStockThreshold,
            purchaseMode: mode,
            contactOnly: mode === "quotation",
            batch: batchRecord,
            documentLocales: [
              ...new Set(
                publicDocs
                  .filter(
                    (doc) =>
                      (DOCUMENT_TYPES as readonly string[]).includes(doc.type) &&
                      publicDocumentUrl(doc) &&
                      (doc.productId === row.id || doc.productId === null) &&
                      (doc.batchId
                        ? batchLinks.some(
                            (link) => link.id === doc.batchId && link.vialId === vial.id,
                          )
                        : doc.productId === row.id),
                  )
                  .flatMap((doc) => doc.displayLocales),
              ),
            ],
          }
        })
      if (!vialsForProduct.length) continue
      const product: Product = {
        slug: row.slug,
        category: (category ?? reference?.category ?? "supplies") as Product["category"],
        hue: row.hue,
        dataSource: "database",
        productType: row.productType as Product["productType"],
        specificationsVerified,
        checkoutTest,
        createdAt: row.createdAt.toISOString(),
        casNumber: specificationsVerified ? (row.casNumber ?? undefined) : undefined,
        molecularFormula: specificationsVerified ? (row.molecularFormula ?? undefined) : undefined,
        molecularWeight: specificationsVerified ? (row.molecularWeight ?? undefined) : undefined,
        sequence:
          specificationsVerified && row.productType === "peptide"
            ? (row.sequence ?? undefined)
            : undefined,
        storageTemp: specificationsVerified ? (row.storageTemp ?? "") : "",
        vials: vialsForProduct,
        defaultTranslation: {
          name: fallbackName,
          tagline:
            specificationsVerified || checkoutTest
              ? (localized.find((t) => t.locale === "en")?.tagline ?? neutral.en)
              : neutral.en,
          description:
            specificationsVerified || checkoutTest
              ? (localized.find((t) => t.locale === "en")?.description ?? neutral.en)
              : neutral.en,
        },
        translations: {},
      }
      // Every locale is resolved here, once, so the cached catalogue is
      // identical for all visitors and the page render never has to ask the
      // database for a translation again.
      for (const locale of STOREFRONT_LOCALES) {
        const translation = localized.find((t) => t.locale === locale)
        const fallback = reference?.translations?.[locale]
        product.translations![locale] = {
          name: translation?.name ?? fallback?.name ?? fallbackName,
          tagline:
            (specificationsVerified || product.checkoutTest) && translation?.tagline
              ? translation.tagline
              : (fallback?.tagline ?? neutral[locale]),
          description:
            (specificationsVerified || product.checkoutTest) && translation?.description
              ? translation.description
              : (fallback?.description ?? neutral[locale]),
        }
      }
      product.latestBatch = defaultVial(product).batch
      product.purityPercent =
        row.productType !== "supplies" && product.latestBatch?.hplcPurity
          ? product.latestBatch.hplcPurity
          : undefined
      result.push(product)
    }
    return result
  } catch (error) {
    logger.warn(
      "[catalogue] database unavailable; reference catalogue is not purchasable",
      error instanceof Error ? error.message : "unknown error",
    )
    return references
  }
}
