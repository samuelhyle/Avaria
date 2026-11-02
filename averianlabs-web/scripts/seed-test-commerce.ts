/** Isolated database fixtures. Never import into application runtime or run on a merchant database. */
import crypto from "node:crypto"
import { batches, categories, coaTests, documents, productTranslations, products, vials } from "@/db/schema"
import { db } from "@/lib/db"
import { eq, inArray } from "drizzle-orm"

const testUrl = process.env.TEST_DATABASE_URL
if (!testUrl || testUrl !== process.env.DATABASE_URL)
  throw new Error("Explicit matching TEST_DATABASE_URL required")
const url = new URL(testUrl)
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  !["/averian_reliability", "/build"].includes(url.pathname)
)
  throw new Error("Fixtures are restricted to an isolated local/CI database")
const marker = "isolated-browser-fixture"
const slugs = ["qa-peptide", "qa-water"]
try {
  await db.transaction(async (tx) => {
    for (const old of await tx.select().from(products).where(inArray(products.slug, slugs))) {
      if ((old.specJson as { evidenceRef?: string })?.evidenceRef !== marker)
        throw new Error("Refusing to modify an unowned product")
      await tx.delete(documents).where(eq(documents.productId, old.id))
      await tx.delete(products).where(eq(products.id, old.id))
    }
    if (process.argv.includes("--cleanup")) return
    const [category] = await tx.select().from(categories).where(eq(categories.slug, "supplies"))
    if (!category) throw new Error("Run db:seed before browser fixtures")
    for (const slug of slugs) {
      const id = crypto.randomUUID()
      const water = slug === "qa-water"
      await tx.insert(products).values({
        id,
        slug,
        categoryId: category.id,
        productType: water ? "supplies" : "peptide",
        status: "active",
        specJson: { verified: true, evidenceRef: marker },
      })
      await tx.insert(productTranslations).values([
        {
          productId: id,
          locale: "en",
          name: water ? "QA water — test fixture" : "QA peptide — test fixture",
          description: "Isolated automated test data. Never publish.",
        },
        {
          productId: id,
          locale: "fi",
          name: water ? "QA-vesi — testitieto" : "QA-peptidi — testitieto",
          description: "Eristettyä testitietoa. Ei julkaistavaksi.",
        },
      ])
      for (const size of water ? [10] : [5, 10]) {
        const [vial] = await tx
          .insert(vials)
          .values({
            productId: id,
            sku: `QA-${water ? "WATER" : "PEPTIDE"}-${size}`,
            sizeValue: size,
            sizeUnit: water ? "mL" : "mg",
            sizeMg: water ? null : size,
            priceCents: size === 5 ? 4000 : 6500,
            stockQty: 20,
            purchaseMode: "direct",
          })
          .returning()
        if (!vial) throw new Error("Fixture insert failed")
        const [batch] = await tx
          .insert(batches)
          .values({
            vialId: vial.id,
            code: `QA-${water ? "WATER" : "PEPTIDE"}-${size}-BATCH`,
            manufacturedAt: new Date("2026-01-01"),
            expiresAt: new Date("2050-01-01"),
            hplcPurity: 0,
            endotoxinEUPerMg: 0,
            lab: "Automated test fixture",
            verificationStatus: "released",
            reviewedBy: "Automated test fixture",
            reviewedAt: new Date(),
          })
          .returning()
        if (!batch) throw new Error("Fixture batch failed")
        await tx.update(vials).set({ activeBatchId: batch.id }).where(eq(vials.id, vial.id))
        // The assay rows the certificate reports, so the library can show the
        // method and the specification beside the number.
        await tx.insert(coaTests).values([
          {
            batchId: batch.id,
            testName: "HPLC purity",
            method: "RP-HPLC (C18, 280 nm)",
            result: "99.000 % area",
            spec: "≥ 98.0 % area",
            pass: true,
            performedAt: new Date("2026-01-01"),
          },
          {
            batchId: batch.id,
            testName: "Endotoxin",
            method: "LAL (USP <85>)",
            result: "0.2 EU/mg",
            spec: "≤ 2.4 EU/mg",
            pass: true,
            performedAt: new Date("2026-01-01"),
          },
        ])
        await tx.insert(documents).values({
          productId: id,
          batchId: batch.id,
          type: "coa",
          title: "Automated test fixture report — not supplier evidence",
          displayLocales: ["en", "fi"],
          externalUrl: "https://example.invalid/qa-report.pdf",
          requiresLogin: false,
        })
      }
    }
  })
  console.log(
    process.argv.includes("--cleanup")
      ? "Browser fixtures removed"
      : "Isolated browser fixtures ready",
  )
} finally {
  await globalThis.__averianlabsPg?.end()
}
