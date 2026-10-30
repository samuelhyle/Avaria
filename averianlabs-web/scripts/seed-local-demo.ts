/**
 * Seed a fully orderable catalogue for local testing.
 *
 * The ordinary seed writes the reference products as drafts with no batches and
 * no prices, because the supplier evidence for them does not exist. That is
 * correct for a database that might hold real orders, and useless for testing
 * the store: nothing could be bought.
 *
 * This script promotes the reference catalogue into a locally orderable state
 * — active products, prices, stock, a released batch per variant and a public
 * certificate per batch. Everything it writes is marked `local-demo-fixture` so
 * it can never be mistaken for supplier evidence, and it only ever runs against
 * a local database.
 *
 * Usage:
 *   DATABASE_URL=postgres://…/build pnpm db:seed-demo
 */
import crypto from "node:crypto"
import { batches, categories, documents, productTranslations, products, vials } from "@/db/schema"
import { db } from "@/lib/db"
import { products as referenceProducts } from "@/lib/products/data"
import { and, eq } from "drizzle-orm"

const MARKER = "local-demo-fixture"

/** Only ever run against a local database. */
function requireLocalDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "")
  if (!["localhost", "127.0.0.1"].includes(url.hostname))
    throw new Error("This seed only runs against a local database")
  const database = url.pathname.replace(/^\//, "")
  if (!["averian_reliability", "build"].includes(database))
    throw new Error("This seed only runs against the `build` or `averian_reliability` database")
}

async function main() {
  requireLocalDatabase()

  const now = new Date()
  for (const reference of referenceProducts) {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, reference.category))
      .limit(1)
    const categoryId = category?.id

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.slug, reference.slug))
      .limit(1)
    if (!product) {
      console.warn(`[demo] no seeded product row for ${reference.slug} — run db:seed first`)
      continue
    }

    await db
      .update(products)
      .set({
        status: "active",
        categoryId,
        productType:
          reference.category === "supplies"
            ? "supplies"
            : reference.slug === "nad-plus"
              ? "reagent"
              : "peptide",
        hue: reference.hue,
        casNumber: reference.casNumber ?? null,
        molecularFormula: reference.molecularFormula ?? null,
        molecularWeight: reference.molecularWeight ?? null,
        sequence: reference.sequence ?? null,
        storageTemp: reference.storageTemp ?? null,
        specJson: { verified: true, evidenceRef: MARKER },
        updatedAt: now,
      })
      .where(eq(products.id, product.id))

    // Every locale's copy, so the store reads the same in all five.
    const translations = [
      { locale: "en", translation: reference.defaultTranslation },
      ...(["fi", "sv", "ru"] as const).map((locale) => ({
        locale,
        translation: reference.translations?.[locale],
      })),
    ].filter(
      (entry): entry is { locale: string; translation: NonNullable<typeof entry.translation> } =>
        Boolean(entry.translation),
    )
    for (const entry of translations) {
      const existing = await db
        .select()
        .from(productTranslations)
        .where(
          and(
            eq(productTranslations.productId, product.id),
            eq(productTranslations.locale, entry.locale),
          ),
        )
        .limit(1)
      const values = {
        productId: product.id,
        locale: entry.locale,
        name: entry.translation.name,
        tagline: entry.translation.tagline,
        description: entry.translation.description,
      }
      if (existing[0])
        await db
          .update(productTranslations)
          .set(values)
          .where(eq(productTranslations.id, existing[0].id))
      else await db.insert(productTranslations).values(values)
    }

    for (const referenceVial of reference.vials) {
      const [vial] = await db.select().from(vials).where(eq(vials.sku, referenceVial.sku)).limit(1)
      if (!vial) continue

      // A released batch per variant, so the batch traceability and the
      // certificate links have something real to point at.
      //
      // Existing batches are reused rather than replaced: an order may already
      // reference one, and deleting it would fail the foreign key.
      const existingBatch = await db
        .select({ id: batches.id })
        .from(batches)
        .where(eq(batches.vialId, vial.id))
        .limit(1)
      const batchCode = `DEMO-${referenceVial.sku}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
      let batchId = existingBatch[0]?.id
      if (batchId) {
        await db
          .update(batches)
          .set({
            code: batchCode,
            manufacturedAt: new Date(reference.latestBatch?.manufacturedAt ?? "2026-06-01"),
            expiresAt: new Date(reference.latestBatch?.expiresAt ?? "2028-06-01"),
            hplcPurity: reference.latestBatch?.hplcPurity ?? 0,
            endotoxinEUPerMg: reference.latestBatch?.endotoxinEUPerMg ?? 0.2,
            msConfirmed: reference.latestBatch?.msConfirmed ?? true,
            lab: reference.latestBatch?.lab ?? "Local demo fixture",
            verificationStatus: "released",
            reviewedBy: MARKER,
            reviewedAt: now,
          })
          .where(eq(batches.id, batchId))
      } else {
        batchId = crypto.randomUUID()
        await db.insert(batches).values({
          id: batchId,
          vialId: vial.id,
          code: batchCode,
          manufacturedAt: new Date(reference.latestBatch?.manufacturedAt ?? "2026-06-01"),
          expiresAt: new Date(reference.latestBatch?.expiresAt ?? "2028-06-01"),
          hplcPurity: reference.latestBatch?.hplcPurity ?? 0,
          endotoxinEUPerMg: reference.latestBatch?.endotoxinEUPerMg ?? 0.2,
          msConfirmed: reference.latestBatch?.msConfirmed ?? true,
          lab: reference.latestBatch?.lab ?? "Local demo fixture",
          verificationStatus: "released",
          reviewedBy: MARKER,
          reviewedAt: now,
        })
      }

      // One public certificate per batch. Existing ones are kept so an order
      // that already points at a document does not lose it.
      const existingDocument = await db
        .select({ id: documents.id })
        .from(documents)
        .where(and(eq(documents.productId, product.id), eq(documents.batchId, batchId)))
        .limit(1)
      if (!existingDocument[0])
        await db.insert(documents).values({
          productId: product.id,
          batchId,
          type: "coa",
          title: `Certificate of Analysis — ${batchCode} (local demo fixture)`,
          displayLocales: ["en", "fi", "sv", "ru"],
          externalUrl: "https://example.invalid/local-demo-coa.pdf",
          requiresLogin: false,
          // Published with the batch it certifies, not with the seed run. The
          // library is ordered by publication date, so dating a whole
          // catalogue to the seed run would put twenty synthetic certificates
          // above every genuine one.
          publishedAt: new Date(reference.latestBatch?.manufacturedAt ?? "2026-06-01"),
        })

      await db
        .update(vials)
        .set({
          sizeValue: referenceVial.sizeValue,
          sizeUnit: referenceVial.sizeUnit,
          sizeMg: referenceVial.sizeUnit === "mg" ? referenceVial.sizeValue : null,
          // A quotation-only vial must have no price: the database refuses
          // to hold one, because quoting a price for something that cannot be
          // ordered is the thing the store must not do.
          priceCents: referenceVial.purchaseMode === "quotation" ? null : referenceVial.priceCents,
          stockQty: referenceVial.stockQty,
          lowStockThreshold: referenceVial.lowStockThreshold,
          purchaseMode: referenceVial.purchaseMode,
          activeBatchId: batchId,
        })
        .where(eq(vials.id, vial.id))
    }

    await db
      .update(products)
      .set({ activeBatchId: null, updatedAt: now })
      .where(eq(products.id, product.id))
  }

  console.log(
    `Local demo catalogue ready: ${referenceProducts.length} products are active, priced, stocked and carry a released batch with a public certificate.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
