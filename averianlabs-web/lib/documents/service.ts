import { batches, documents, productTranslations, products, vials } from "@/db/schema"
import { db } from "@/lib/db"
import { privateDocumentUrl } from "@/lib/storage/documents"
import { type SQL, and, desc, eq, exists, ilike, inArray, lte, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { cache } from "react"
import { publicDocumentUrl } from "./availability"
import { DOCUMENT_TYPES, type DocumentType } from "./constants"
import { type DocumentLibraryFilters, literalSearchPattern } from "./library"

export interface DocumentRecord {
  id: string
  type: DocumentType
  productId: string | null
  productSlug: string | null
  productName: string | null
  batchId: string | null
  batchCode: string | null
  batchSku?: string | null
  batchStatus?: string | null
  title: string
  version: string
  fileR2Key: string | null
  externalUrl: string | null
  publishedAt: Date
  createdAt: Date
  requiresLogin: boolean
}

async function queryDocuments(
  conditions: SQL[],
  locale = "en",
  allowPrivate = false,
  limit = 100,
  offset = 0,
): Promise<DocumentRecord[]> {
  const rows = await db
    .select({
      id: documents.id,
      type: documents.type,
      productId: products.id,
      productSlug: products.slug,
      productName: productTranslations.name,
      batchId: documents.batchId,
      batchCode: batches.code,
      batchSku: vials.sku,
      batchStatus: batches.verificationStatus,
      title: documents.title,
      version: documents.version,
      fileR2Key: documents.fileR2Key,
      externalUrl: documents.externalUrl,
      publishedAt: documents.publishedAt,
      createdAt: documents.createdAt,
      requiresLogin: documents.requiresLogin,
    })
    .from(documents)
    .leftJoin(batches, eq(documents.batchId, batches.id))
    .leftJoin(vials, eq(batches.vialId, vials.id))
    .leftJoin(products, eq(products.id, sql`coalesce(${documents.productId},${vials.productId})`))
    .leftJoin(
      productTranslations,
      and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, locale)),
    )
    .where(
      and(
        ...conditions,
        sql`(${documents.batchId} is null or ${vials.productId}=${products.id})`,
        sql`${locale} = ANY(${documents.displayLocales})`,
        lte(documents.publishedAt, new Date()),
        ...(allowPrivate ? [] : [eq(documents.requiresLogin, false)]),
      ),
    )
    .orderBy(desc(documents.publishedAt), desc(documents.id))
    .limit(limit)
    .offset(offset)
  return rows
    .filter((row) => isDocumentType(row.type))
    .map((row) => ({ ...row, type: row.type as DocumentType }))
}

export const getDocumentById = cache(
  async (id: string, locale = "en", allowPrivate = false) =>
    (await queryDocuments([eq(documents.id, id)], locale, allowPrivate, 1))[0] ?? null,
)

export async function listRecentDocuments(
  opts: { limit?: number; type?: DocumentType; productId?: string; locale?: string } = {},
) {
  return queryDocuments(
    [
      ...(opts.type ? [eq(documents.type, opts.type)] : []),
      ...(opts.productId ? [eq(products.id, opts.productId)] : []),
    ],
    opts.locale ?? "en",
    false,
    opts.limit ?? 50,
  )
}

export async function resolveDocumentUrl(doc: DocumentRecord): Promise<string | null> {
  // Private metadata is never sufficient to expose an external public URL.
  if (doc.requiresLogin) return doc.fileR2Key ? privateDocumentUrl(doc.fileR2Key) : null
  return publicDocumentUrl(doc)
}

export function listDocumentsForProductSlug(slug: string, locale = "en") {
  return queryDocuments([eq(products.slug, slug)], locale)
}
export function listDocumentsForProduct(productId: string, locale = "en") {
  return queryDocuments([eq(products.id, productId)], locale)
}
export function listDocumentsByType(types: DocumentType[], locale = "en") {
  return types.length
    ? queryDocuments([inArray(documents.type, types)], locale)
    : Promise.resolve([])
}
export function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value)
}

export function listDocumentsForBatchIds(ids: string[], locale = "en") {
  return ids.length
    ? queryDocuments([inArray(documents.batchId, ids), eq(documents.type, "coa")], locale)
    : Promise.resolve([])
}

/** Public library filters retain the same locale/date/access/association predicates as all reads. */
export function listPublicDocumentLibrary(filters: DocumentLibraryFilters, locale = "en") {
  const variants = alias(vials, "document_search_variants")
  const matchingSku = (value: string) => {
    const pattern = literalSearchPattern(value)
    return (
      or(
        ilike(vials.sku, pattern),
        and(
          sql`${documents.batchId} is null`,
          exists(
            db
              .select({ id: variants.id })
              .from(variants)
              .where(and(eq(variants.productId, products.id), ilike(variants.sku, pattern))),
          ),
        ),
      ) ?? sql`false`
    )
  }
  const conditions: SQL[] = []
  if (filters.type) conditions.push(eq(documents.type, filters.type))
  if (filters.product) {
    const pattern = literalSearchPattern(filters.product)
    conditions.push(
      or(ilike(products.slug, pattern), ilike(productTranslations.name, pattern)) ?? sql`false`,
    )
  }
  if (filters.sku) conditions.push(matchingSku(filters.sku))
  if (filters.batch) conditions.push(ilike(batches.code, literalSearchPattern(filters.batch)))
  if (filters.q) {
    const pattern = literalSearchPattern(filters.q)
    conditions.push(
      or(
        ilike(documents.title, pattern),
        ilike(products.slug, pattern),
        ilike(productTranslations.name, pattern),
        ilike(batches.code, pattern),
        matchingSku(filters.q),
      ) ?? sql`false`,
    )
  }
  return queryDocuments(conditions, locale, false, 21, (filters.page - 1) * 20)
}
