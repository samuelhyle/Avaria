/**
 * Documents service — typed document viewer.
 *
 * Supports 7 document types (coa, sds, hplc, method, nmr, spec, msds).
 * Each row has an optional Cloudflare R2 key OR an external URL.
 * Server-side, we issue a short-lived signed URL for the R2 key on read.
 *
 * Ported from helix-labs-store v1 (`app/documents/[id]/page.tsx`).
 */

import { batches, documents, productTranslations, products } from "@/db/schema"
import { db } from "@/lib/db"
import { desc, eq, inArray } from "drizzle-orm"
import { cache } from "react"
import { DOCUMENT_TYPES, type DocumentType } from "./constants"

export interface DocumentRecord {
  id: string
  type: DocumentType
  productId: string | null
  productSlug: string | null
  productName: string | null
  batchId: string | null
  batchCode: string | null
  title: string
  version: string
  fileR2Key: string | null
  externalUrl: string | null
  publishedAt: Date
  createdAt: Date
}

async function loadDocumentById(id: string): Promise<DocumentRecord | null> {
  const rows = await db
    .select({
      id: documents.id,
      type: documents.type,
      productId: documents.productId,
      productIdRef: products.slug,
      productNameRef: productTranslations.name,
      productLocale: productTranslations.locale,
      batchId: documents.batchId,
      batchCode: batches.code,
      title: documents.title,
      version: documents.version,
      fileR2Key: documents.fileR2Key,
      externalUrl: documents.externalUrl,
      publishedAt: documents.publishedAt,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .leftJoin(products, eq(documents.productId, products.id))
    .leftJoin(productTranslations, eq(productTranslations.productId, products.id))
    .leftJoin(batches, eq(documents.batchId, batches.id))
    .where(eq(documents.id, id))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  const name =
    rows.find((x) => x.productLocale === "en")?.productNameRef ?? r.productNameRef ?? null
  return {
    id: r.id,
    type: (DOCUMENT_TYPES as readonly string[]).includes(r.type) ? (r.type as DocumentType) : "coa",
    productId: r.productId,
    productSlug: r.productIdRef,
    productName: name,
    batchId: r.batchId,
    batchCode: r.batchCode,
    title: r.title,
    version: r.version,
    fileR2Key: r.fileR2Key,
    externalUrl: r.externalUrl,
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
  }
}

/** Memoized per-request — metadata and page body both fetch the same doc. */
export const getDocumentById = cache(loadDocumentById)

export async function listRecentDocuments(
  opts: { limit?: number; type?: DocumentType; productId?: string } = {},
) {
  const conditions = [] as ReturnType<typeof eq>[]
  if (opts.type) conditions.push(eq(documents.type, opts.type))
  if (opts.productId) conditions.push(eq(documents.productId, opts.productId))

  const rows = await db
    .select({
      id: documents.id,
      type: documents.type,
      productId: documents.productId,
      title: documents.title,
      version: documents.version,
      publishedAt: documents.publishedAt,
      productSlug: products.slug,
      productName: productTranslations.name,
      productLocale: productTranslations.locale,
    })
    .from(documents)
    .leftJoin(products, eq(documents.productId, products.id))
    .leftJoin(productTranslations, eq(productTranslations.productId, products.id))
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(documents.publishedAt))
    .limit(opts.limit ?? 50)
  return rows
}

/**
 * Resolve the URL to fetch the actual document file.
 *
 * - externalUrl → returned as-is
 * - fileR2Key → returns a short-lived signed URL (mocked locally if R2 not configured)
 * - neither → null (the row is metadata-only)
 */
export function resolveDocumentUrl(doc: DocumentRecord): string | null {
  if (doc.externalUrl) return doc.externalUrl
  if (doc.fileR2Key) {
    const base =
      process.env.R2_PUBLIC_URL ??
      process.env.R2_PUBLIC_BASE_URL ??
      process.env.NEXT_PUBLIC_R2_BASE_URL ??
      ""
    if (!base) return null
    const separator = base.endsWith("/") ? "" : "/"
    return `${base}${separator}${doc.fileR2Key}`
  }
  return null
}

export async function listDocumentsForProductSlug(slug: string): Promise<DocumentRecord[]> {
  const rows = await db
    .select({
      id: documents.id,
      type: documents.type,
      productId: documents.productId,
      productSlug: products.slug,
      productName: productTranslations.name,
      productLocale: productTranslations.locale,
      batchId: documents.batchId,
      batchCode: batches.code,
      title: documents.title,
      version: documents.version,
      fileR2Key: documents.fileR2Key,
      externalUrl: documents.externalUrl,
      publishedAt: documents.publishedAt,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .leftJoin(products, eq(documents.productId, products.id))
    .leftJoin(productTranslations, eq(productTranslations.productId, products.id))
    .leftJoin(batches, eq(documents.batchId, batches.id))
    .where(eq(products.slug, slug))
    .orderBy(desc(documents.publishedAt))
  const name = rows.find((r) => r.productLocale === "en")?.productName ?? null
  return rows.map((r) => ({
    id: r.id,
    type: (DOCUMENT_TYPES as readonly string[]).includes(r.type) ? (r.type as DocumentType) : "coa",
    productId: r.productId,
    productSlug: r.productSlug,
    productName: name,
    batchId: r.batchId,
    batchCode: r.batchCode,
    title: r.title,
    version: r.version,
    fileR2Key: r.fileR2Key,
    externalUrl: r.externalUrl,
    publishedAt: r.publishedAt,
    createdAt: r.createdAt,
  }))
}

export async function listDocumentsForProduct(productId: string): Promise<DocumentRecord[]> {
  const rows = await db
    .select({
      id: documents.id,
      type: documents.type,
      productId: documents.productId,
      batchId: documents.batchId,
      title: documents.title,
      version: documents.version,
      fileR2Key: documents.fileR2Key,
      externalUrl: documents.externalUrl,
      publishedAt: documents.publishedAt,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.productId, productId))
    .orderBy(desc(documents.publishedAt))
  return rows.map((r) => ({
    ...r,
    productSlug: null,
    productName: null,
    batchCode: null,
    type: (DOCUMENT_TYPES as readonly string[]).includes(r.type) ? (r.type as DocumentType) : "coa",
  }))
}

export async function listDocumentsByType(types: DocumentType[]): Promise<DocumentRecord[]> {
  if (types.length === 0) return []
  const rows = await db
    .select({
      id: documents.id,
      type: documents.type,
      productId: documents.productId,
      productSlug: products.slug,
      productName: productTranslations.name,
      productLocale: productTranslations.locale,
      batchId: documents.batchId,
      batchCode: batches.code,
      title: documents.title,
      version: documents.version,
      fileR2Key: documents.fileR2Key,
      externalUrl: documents.externalUrl,
      publishedAt: documents.publishedAt,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .leftJoin(products, eq(documents.productId, products.id))
    .leftJoin(productTranslations, eq(productTranslations.productId, products.id))
    .leftJoin(batches, eq(documents.batchId, batches.id))
    .where(inArray(documents.type, types))
    .orderBy(desc(documents.publishedAt))
  return rows.map((r) => ({
    ...r,
    type: (DOCUMENT_TYPES as readonly string[]).includes(r.type) ? (r.type as DocumentType) : "coa",
    productName: rows.find((x) => x.productLocale === "en")?.productName ?? r.productName ?? null,
  }))
}

export function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value)
}
