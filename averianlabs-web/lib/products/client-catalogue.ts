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
 * Every field kept below was confirmed to be read by a client component. The
 * ones removed are read on the server only — the product page, the compare
 * table and the structured data all use the full catalogue directly, so
 * nothing that renders them lost anything.
 *
 * Server components — the product page, the shop page, the checkout — keep
 * using the full catalogue from `getStorefrontCatalogue()`.
 */
export function toClientCatalogue(
  products: Product[],
  locale: Locale,
  options: { specifications?: boolean } = {},
): Product[] {
  return products.map((product) => {
    const translation = product.translations?.[locale] ?? product.defaultTranslation
    return {
      slug: product.slug,
      category: product.category,
      hue: product.hue,
      // Read by the cart to drop the non-purchasable reference rows.
      dataSource: product.dataSource,
      // Read by the shop filters to separate peptides from reagents and
      // supplies.
      productType: product.productType,
      // Read by the shop's "newest" sort, which is the default filter.
      createdAt: product.createdAt,
      // Read by the shop search and the command palette.
      casNumber: product.casNumber,
      // Read by the product render, which prints it on the label.
      molecularWeight: product.molecularWeight,
      // The molecular formula, the sequence and the storage temperature are
      // read by the compare table and by nothing else. They are kept only
      // when a route asks for them, because on every other page they are
      // dead weight in the response.
      molecularFormula: options.specifications ? product.molecularFormula : undefined,
      sequence: options.specifications ? product.sequence : undefined,
      storageTemp: options.specifications ? product.storageTemp : "",
      // Read by the shop filters, the product card and the compare sheet.
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
        // Required by the type, read by nothing in the browser.
        lowStockThreshold: null,
        purchaseMode: vial.purchaseMode,
        documentLocales: vial.documentLocales,
        // Only the batch code reaches the browser: the search index looks it
        // up, and the document link is built from it. The measured purity,
        // the dates and the laboratory are rendered on the product page from
        // the full record on the server.
        batch: vial.batch ? { code: vial.batch.code } : undefined,
      })),
    } as Product
  })
}
