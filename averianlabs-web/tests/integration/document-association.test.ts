import { batches, documents, productTranslations, products, vials } from "@/db/schema"
import { getDocumentsTool } from "@/lib/ai/tools/get-documents"
import { db } from "@/lib/db"
import { readDocumentFilters } from "@/lib/documents/library"
import {
  listDocumentsForProduct,
  listDocumentsForProductSlug,
  listPublicDocumentLibrary,
} from "@/lib/documents/service"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { hasPublishedDocuments } from "@/lib/products/document-status"
import { eq, inArray } from "drizzle-orm"
import { expect, it } from "vitest"

it("associates a batch-only public report without confusing its availability with batch release", async () => {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "http://invalid")
  if (
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/averian_reliability", "/build"].includes(url.pathname)
  )
    throw new Error("isolated database required")
  const prefix = `qa-doc-${crypto.randomUUID()}`
  const firstId = `${prefix}-one`
  const otherId = `${prefix}-other`
  const ids = [firstId, otherId]
  const docIds = ["public", "private", "future", "wrong"].map((name) => `${prefix}-${name}`)
  try {
    await db
      .insert(products)
      .values(ids.map((id) => ({ id, slug: id, status: "draft", productType: "peptide" })))
    await db
      .insert(productTranslations)
      .values(
        ids.map((id) => ({ productId: id, locale: "en", name: "QA document association fixture" })),
      )
    await db.insert(vials).values({
      id: prefix,
      productId: firstId,
      sku: prefix,
      sizeValue: 5,
      sizeUnit: "mg",
      stockQty: 0,
      priceCents: 0,
      purchaseMode: "unavailable",
    })
    await db.insert(batches).values({
      id: prefix,
      vialId: prefix,
      code: prefix,
      manufacturedAt: new Date("2026-01-01"),
      expiresAt: new Date("2050-01-01"),
      hplcPurity: 0,
      endotoxinEUPerMg: 0,
      lab: "QA fixture",
      verificationStatus: "pending",
    })
    await db.insert(documents).values(
      docIds.map((id, index) => ({
        id,
        batchId: prefix,
        productId: index === 3 ? ids[1] : null,
        type: "coa",
        title: "QA fixture — not supplier evidence",
        requiresLogin: index === 1,
        publishedAt: new Date(index === 2 ? "2050-01-01" : "2026-01-01"),
        displayLocales: ["en"],
        externalUrl: "https://example.invalid/qa.pdf",
      })),
    )
    const listed = await listDocumentsForProduct(firstId, "en")
    expect(listed.map((doc) => doc.id)).toEqual([docIds[0]])
    expect(listed[0]).toMatchObject({ productId: ids[0], batchSku: prefix, batchStatus: "pending" })
    expect(
      (await listPublicDocumentLibrary(readDocumentFilters({ sku: prefix }), "en")).map(
        (doc) => doc.id,
      ),
    ).toEqual([docIds[0]])
    expect(
      (await listPublicDocumentLibrary(readDocumentFilters({ q: prefix, type: "coa" }), "en")).map(
        (doc) => doc.id,
      ),
    ).toEqual([docIds[0]])
    expect(
      await listPublicDocumentLibrary(readDocumentFilters({ batch: prefix, type: "sds" }), "en"),
    ).toEqual([])
    expect(await listPublicDocumentLibrary(readDocumentFilters({ sku: prefix }), "fi")).toEqual([])
    expect((await listDocumentsForProductSlug(otherId, "en")).length).toBe(0)
    expect((await listDocumentsForProduct(firstId, "fi")).length).toBe(0)
    const product = (await getStorefrontCatalogue()).find((product) => product.slug === ids[0])
    if (!product) throw new Error("QA catalogue product missing")
    expect(hasPublishedDocuments(product, "en", prefix)).toBe(true)
    expect(hasPublishedDocuments(product, "fi", prefix)).toBe(false)
    expect(product.vials[0]?.batch).toBeUndefined()
    expect(product.vials[0]?.purchaseMode).toBe("unavailable")
    const found = await getDocumentsTool.execute({ slug: firstId }, { locale: "en", cart: [] })
    expect(
      (found.content as { documents: Array<{ sku: string; batchStatus: string }> }).documents,
    ).toMatchObject([{ sku: prefix, batchStatus: "pending" }])
    const specificationId = `${prefix}-specification`
    docIds.push(specificationId)
    await db.insert(vials).values({
      id: `${prefix}-larger`,
      productId: firstId,
      sku: `${prefix}-larger`,
      sizeValue: 10,
      sizeUnit: "mg",
      stockQty: 0,
      priceCents: 0,
      purchaseMode: "unavailable",
    })
    await db.insert(documents).values({
      id: specificationId,
      productId: firstId,
      batchId: null,
      type: "spec",
      title: "QA product-wide specification — not supplier evidence",
      displayLocales: ["en"],
      publishedAt: new Date("2026-01-01"),
      externalUrl: "https://example.invalid/qa-spec.pdf",
    })
    const larger = await listPublicDocumentLibrary(
      readDocumentFilters({ sku: `${prefix}-larger` }),
      "en",
    )
    expect(larger.map((doc) => doc.id)).toEqual([specificationId])
    expect(larger[0]).toMatchObject({ batchId: null, productId: firstId })
  } finally {
    await db.delete(documents).where(inArray(documents.id, docIds))
    await db.delete(batches).where(eq(batches.id, prefix))
    await db.delete(products).where(inArray(products.id, ids))
  }
})
