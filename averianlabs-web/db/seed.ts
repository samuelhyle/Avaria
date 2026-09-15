import { db, schema } from "@/lib/db"
import { products as seedProducts } from "@/lib/products/data"
import { eq } from "drizzle-orm"

async function seed() {
  console.log("🌱 Seeding AverianLabs database…")

  for (const p of seedProducts) {
    // Look up existing product by slug so we can reuse its id (or create new).
    const existing = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, p.slug))
      .limit(1)
    const productId = existing[0]?.id ?? crypto.randomUUID()
    await db
      .insert(schema.products)
      .values({
        id: productId,
        slug: p.slug,
        casNumber: p.casNumber,
        molecularFormula: p.molecularFormula,
        molecularWeight: p.molecularWeight,
        sequence: p.sequence,
        storageTemp: p.storageTemp,
        purityPercent: p.purityPercent,
        hue: p.hue,
        status: "active",
      })
      .onConflictDoUpdate({
        target: schema.products.id,
        set: {
          casNumber: p.casNumber,
          molecularFormula: p.molecularFormula,
          molecularWeight: p.molecularWeight,
          sequence: p.sequence,
          storageTemp: p.storageTemp,
          purityPercent: p.purityPercent,
          hue: p.hue,
        },
      })

    for (const v of p.vials) {
      const existingVial = await db
        .select({ id: schema.vials.id })
        .from(schema.vials)
        .where(eq(schema.vials.sku, v.sku))
        .limit(1)
      const vialId = existingVial[0]?.id ?? crypto.randomUUID()
      await db
        .insert(schema.vials)
        .values({
          id: vialId,
          productId,
          sizeMg: v.mg,
          sku: v.sku,
          priceCents: v.priceCents,
          compareAtCents: v.compareAtCents ?? null,
          stockQty: v.stockQty,
          lowStockThreshold: v.lowStockThreshold,
        })
        .onConflictDoUpdate({
          target: schema.vials.id,
          set: {
            priceCents: v.priceCents,
            compareAtCents: v.compareAtCents ?? null,
            stockQty: v.stockQty,
            lowStockThreshold: v.lowStockThreshold,
          },
        })

      if (p.latestBatch) {
        const existingBatch = await db
          .select({ id: schema.batches.id })
          .from(schema.batches)
          .where(eq(schema.batches.code, p.latestBatch.code))
          .limit(1)
        const batchId = existingBatch[0]?.id ?? crypto.randomUUID()
        await db
          .insert(schema.batches)
          .values({
            id: batchId,
            vialId,
            code: p.latestBatch.code,
            manufacturedAt: new Date(p.latestBatch.manufacturedAt),
            expiresAt: new Date(p.latestBatch.expiresAt),
            hplcPurity: p.latestBatch.hplcPurity,
            endotoxinEUPerMg: p.latestBatch.endotoxinEUPerMg,
            msConfirmed: p.latestBatch.msConfirmed,
            lab: p.latestBatch.lab,
          })
          .onConflictDoUpdate({
            target: schema.batches.id,
            set: {
              hplcPurity: p.latestBatch.hplcPurity,
              endotoxinEUPerMg: p.latestBatch.endotoxinEUPerMg,
              msConfirmed: p.latestBatch.msConfirmed,
            },
          })
      }
    }

    for (const [locale, tr] of Object.entries(p.translations ?? {})) {
      await db
        .insert(schema.productTranslations)
        .values({
          productId,
          locale,
          name: tr.name,
          tagline: tr.tagline,
          description: tr.description,
        })
        .onConflictDoNothing()
    }
    await db
      .insert(schema.productTranslations)
      .values({
        productId,
        locale: "en",
        name: p.defaultTranslation.name,
        tagline: p.defaultTranslation.tagline,
        description: p.defaultTranslation.description,
      })
      .onConflictDoNothing()
  }

  console.log("✅ Seeded", seedProducts.length, "products")
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
