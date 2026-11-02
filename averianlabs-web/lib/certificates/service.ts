import {
  batches,
  categories,
  coaTests,
  documents,
  productTranslations,
  products,
  vials,
} from "@/db/schema"
import { CHECKOUT_FIXTURE_SLUGS } from "@/lib/checkout/test-product"
import { db } from "@/lib/db"
import { publicDocumentUrl } from "@/lib/documents/availability"
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/documents/constants"
import { and, desc, eq, gt, inArray, isNotNull, lte } from "drizzle-orm"
import { type CertificateFilters, matchesCertificateField, matchesCertificateTerm } from "./library"
import {
  type BatchCertificate,
  type CertificateTest,
  isDemonstrationCertificate,
  isPublishableCertificate,
} from "./types"

/**
 * The certificate library.
 *
 * It reads released batches — lots that were reviewed and signed off, with a
 * reviewer and a review date — and joins the certificate document published
 * for each one, plus the individual assay rows that document reports.
 *
 * Three rules keep it honest:
 *
 *  - only released, reviewed, unexpired lots appear;
 *  - a lot appears only when its certificate document is publicly readable,
 *    so the library never lists evidence a reader cannot open;
 *  - a demonstration lot is labelled as one, so a locally seeded fixture can
 *    never be read as a supplier's certificate.
 */

interface BatchRow {
  batchId: string
  batchCode: string
  hplcPurity: number
  endotoxinEUPerMg: number
  msConfirmed: boolean
  lab: string
  manufacturedAt: Date
  expiresAt: Date
  reviewedBy: string | null
  sku: string
  sizeValue: number
  sizeUnit: string
  productId: string
  productSlug: string
  productType: string | null
  category: string | null
  productName: string | null
  specJson: unknown
}

async function readBatchRows(locale: string): Promise<BatchRow[]> {
  return db
    .select({
      batchId: batches.id,
      batchCode: batches.code,
      hplcPurity: batches.hplcPurity,
      endotoxinEUPerMg: batches.endotoxinEUPerMg,
      msConfirmed: batches.msConfirmed,
      lab: batches.lab,
      manufacturedAt: batches.manufacturedAt,
      expiresAt: batches.expiresAt,
      reviewedBy: batches.reviewedBy,
      sku: vials.sku,
      sizeValue: vials.sizeValue,
      sizeUnit: vials.sizeUnit,
      productId: products.id,
      productSlug: products.slug,
      productType: products.productType,
      category: categories.slug,
      productName: productTranslations.name,
      specJson: products.specJson,
    })
    .from(batches)
    .innerJoin(vials, eq(batches.vialId, vials.id))
    .innerJoin(products, eq(vials.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(
      productTranslations,
      and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, locale)),
    )
    .where(
      and(
        eq(batches.verificationStatus, "released"),
        isNotNull(batches.reviewedBy),
        isNotNull(batches.reviewedAt),
        gt(batches.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(batches.manufacturedAt))
}

export async function listBatchCertificates(filters: CertificateFilters, locale = "en") {
  const rows = await readBatchRows(locale)
  if (!rows.length) return { certificates: [] as BatchCertificate[], total: 0 }

  const batchIds = rows.map((row) => row.batchId)
  const [docRows, testRows] = await Promise.all([
    db
      .select({
        id: documents.id,
        batchId: documents.batchId,
        type: documents.type,
        title: documents.title,
        externalUrl: documents.externalUrl,
        fileR2Key: documents.fileR2Key,
        requiresLogin: documents.requiresLogin,
        displayLocales: documents.displayLocales,
      })
      .from(documents)
      .where(
        and(
          eq(documents.type, "coa"),
          eq(documents.requiresLogin, false),
          lte(documents.publishedAt, new Date()),
          inArray(documents.batchId, batchIds),
        ),
      ),
    db
      .select({
        id: coaTests.id,
        batchId: coaTests.batchId,
        testName: coaTests.testName,
        method: coaTests.method,
        result: coaTests.result,
        spec: coaTests.spec,
        pass: coaTests.pass,
        performedAt: coaTests.performedAt,
      })
      .from(coaTests)
      .where(inArray(coaTests.batchId, batchIds))
      .orderBy(coaTests.performedAt),
  ])

  const documentsByBatch = new Map<string, (typeof docRows)[number]>()
  for (const doc of docRows) {
    if (!doc.batchId) continue
    if (!doc.displayLocales.includes(locale)) continue
    if (!publicDocumentUrl(doc)) continue
    const current = documentsByBatch.get(doc.batchId)
    // Several documents can cover one lot; the earliest published one is the
    // certificate of record for that lot.
    if (!current) documentsByBatch.set(doc.batchId, doc)
  }

  const testsByBatch = new Map<string, CertificateTest[]>()
  for (const test of testRows) {
    const list = testsByBatch.get(test.batchId) ?? []
    list.push({
      id: test.id,
      name: test.testName,
      method: test.method,
      result: test.result,
      spec: test.spec,
      pass: test.pass,
      performedAt: test.performedAt.toISOString(),
    })
    testsByBatch.set(test.batchId, list)
  }

  const certificates: BatchCertificate[] = []
  for (const row of rows) {
    const doc = documentsByBatch.get(row.batchId)
    const documentUrl = doc ? publicDocumentUrl(doc) : null
    // A product the shop does not sell has no certificate to publish: the
    // checkout fixture is a payment test, and it is in the storefront only
    // while that test is being run.
    const specs = (row.specJson ?? {}) as Record<string, unknown>
    const checkoutTest = specs.checkoutTest === true || CHECKOUT_FIXTURE_SLUGS.has(row.productSlug)
    if (checkoutTest && process.env.CHECKOUT_FIXTURE_IN_STOREFRONT !== "true") continue
    const demonstration = isDemonstrationCertificate({
      reviewedBy: row.reviewedBy,
      documentTitle: doc?.title,
      lab: row.lab,
    })
    if (!isPublishableCertificate({ documentUrl })) continue
    const certificate: BatchCertificate = {
      batchId: row.batchId,
      batchCode: row.batchCode,
      productId: row.productId,
      productSlug: row.productSlug,
      productName: row.productName ?? row.productSlug,
      productType: row.productType,
      category: row.category,
      sku: row.sku,
      sizeValue: row.sizeValue,
      sizeUnit: row.sizeUnit,
      hplcPurity: row.hplcPurity,
      endotoxinEUPerMg: row.endotoxinEUPerMg,
      msConfirmed: row.msConfirmed,
      lab: row.lab,
      manufacturedAt: row.manufacturedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      documentId: doc?.id ?? null,
      documentTitle: doc?.title ?? null,
      documentType:
        doc && (DOCUMENT_TYPES as readonly string[]).includes(doc.type)
          ? (doc.type as DocumentType)
          : null,
      documentUrl,
      tests: testsByBatch.get(row.batchId) ?? [],
      demonstration,
    }
    if (!matchesCertificateTerm(certificate, filters.q)) continue
    if (
      !matchesCertificateField(certificate.productName, filters.product) &&
      !matchesCertificateField(certificate.productSlug, filters.product)
    )
      continue
    if (!matchesCertificateField(certificate.sku, filters.sku)) continue
    if (!matchesCertificateField(certificate.batchCode, filters.batch)) continue
    if (!matchesCertificateField(certificate.lab, filters.lab)) continue
    if (filters.minPurity !== null && certificate.hplcPurity < filters.minPurity) continue
    certificates.push(certificate)
  }

  return { certificates, total: certificates.length }
}

/** Every distinct laboratory named on a published certificate, for the filter list. */
export async function listCertificateLabs(locale = "en"): Promise<string[]> {
  const rows = await readBatchRows(locale)
  const labs = new Set<string>()
  for (const row of rows) {
    if (isDemonstrationCertificate({ reviewedBy: row.reviewedBy, lab: row.lab })) continue
    if (row.lab) labs.add(row.lab)
  }
  return [...labs].sort((a, b) => a.localeCompare(b))
}

/** The published certificates for one product, for the product page. */
export async function listCertificatesForProduct(
  productSlug: string,
  locale = "en",
): Promise<BatchCertificate[]> {
  const { certificates } = await listBatchCertificates(
    { q: "", product: productSlug, sku: "", batch: "", lab: "", minPurity: null, page: 1 },
    locale,
  )
  return certificates.filter((certificate) => certificate.productSlug === productSlug)
}
