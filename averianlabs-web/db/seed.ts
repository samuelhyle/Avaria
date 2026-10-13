import crypto from "node:crypto"
import { db, schema } from "@/lib/db"
import { products as referenceProducts } from "@/lib/products/data"
import { eq } from "drizzle-orm"

/** Reference entries are drafts. Seeding never overwrites commercial inventory or invents batch evidence. */
async function seed() {
  for (const product of referenceProducts) {
    await db.insert(schema.categories).values({ slug: product.category, name: product.category }).onConflictDoNothing({ target: schema.categories.slug })
    const [category] = await db.select().from(schema.categories).where(eq(schema.categories.slug, product.category))
    await db.insert(schema.products).values({ slug: product.slug, categoryId: category?.id, casNumber: product.casNumber, molecularFormula: product.molecularFormula, molecularWeight: product.molecularWeight, sequence: product.sequence, storageTemp: product.storageTemp, hue: product.hue, status: "draft", productType: product.category === "supplies" ? "supplies" : product.slug === "nad-plus" ? "reagent" : "peptide", specJson: { verified: false } }).onConflictDoNothing({ target: schema.products.slug })
    const [row] = await db.select().from(schema.products).where(eq(schema.products.slug, product.slug))
    if (!row) throw new Error("Product seed failed")
    for (const vial of product.vials) await db.insert(schema.vials).values({ id: crypto.randomUUID(), productId: row.id, sizeMg: vial.sizeUnit === "mg" ? vial.sizeValue : null, sizeValue: vial.sizeValue, sizeUnit: vial.sizeUnit, sku: vial.sku, priceCents: vial.purchaseMode === "quotation" ? null : vial.priceCents, stockQty: 0, lowStockThreshold: null, purchaseMode: vial.purchaseMode === "quotation" ? "quotation" : "unavailable" }).onConflictDoNothing({ target: schema.vials.sku })
    for (const [locale, translation] of Object.entries({ en: product.defaultTranslation, ...product.translations })) await db.insert(schema.productTranslations).values({ productId: row.id, locale, name: translation.name, tagline: translation.tagline, description: translation.description }).onConflictDoNothing()
  }
  console.log(`Seeded ${referenceProducts.length} reference products as drafts. Original batch reports and owner review are required before sale.`)
}
seed().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1) })
