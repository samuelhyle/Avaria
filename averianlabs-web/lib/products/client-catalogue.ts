import type { Locale, Product } from "./types"

/**
 * The catalogue shape the browser actually reads.
 *
 * `Chrome` hands the full catalogue to `CatalogueProvider`, which put every
 * product — with all four language translations, full batch records and
 * specification strings — into the RSC payload of every page. That was ~98 KiB
 * of inline JSON on the home page, for fields no client component reads.
 *
 * This mapper keeps every field a client component actually touches and
 * drops the rest. The type stays `Product`, so no consumer has to change: the
 * trimmed records simply carry empty values for the fields that only the
 * server renders.
 *
 * Server components — the product page, the shop page, the checkout — keep
 * using the full catalogue from `getStorefrontCatalogue()`.
 */
export function toClientCatalogue(products: Product[], locale: Locale): Product[] {
  return products.map((product) => {
    const translation = product.translations?.[locale] ?? product.defaultTranslation
    return {
      slug: product.slug,
      category: product.category,
      hue: product.hue,
      dataSource: product.dataSource,
      productType: product.productType,
      checkoutTest: product.checkoutTest,
      createdAt: product.createdAt,
      casNumber: product.casNumber,
      molecularFormula: product.molecularFormula,
      molecularWeight: product.molecularWeight,
      sequence: product.sequence,
      storageTemp: product.storageTemp,
      purityPercent: product.purityPercent,
      // The canonical (English) name stays in `defaultTranslation`: it is the
      // stable identifier the assistant and the search index use. The active
      // locale is kept alongside it so the interface renders in the shopper's
      // language. Every other locale is dropped — the browser never reads it.
      defaultTranslation: {
        name: product.defaultTranslation.name,
        tagline: product.defaultTranslation.tagline,
        description: "",
      },
      translations: {
        [locale]: {
          name: translation.name,
          tagline: translation.tagline,
          description: "",
        },
      },
      vials: product.vials.map((vial) => ({
        mg: vial.mg,
        sizeValue: vial.sizeValue,
        sizeUnit: vial.sizeUnit,
        sku: vial.sku,
        priceCents: vial.priceCents,
        compareAtCents: vial.compareAtCents,
        stockQty: vial.stockQty,
        lowStockThreshold: vial.lowStockThreshold,
        purchaseMode: vial.purchaseMode,
        contactOnly: vial.contactOnly,
        documentLocales: vial.documentLocales,
        // The batch record is small enough to keep whole: the search index
        // reads its code and the document link is built from it.
        batch: vial.batch,
      })),
    }
  })
}
