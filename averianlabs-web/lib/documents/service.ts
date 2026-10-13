import { batches, documents, productTranslations, products } from "@/db/schema"
import { db } from "@/lib/db"
import { privateDocumentUrl } from "@/lib/storage/documents"
import { and, desc, eq, inArray, lte, sql, type SQL } from "drizzle-orm"
import { cache } from "react"
import { DOCUMENT_TYPES, type DocumentType } from "./constants"

export interface DocumentRecord {
  id: string; type: DocumentType; productId: string | null; productSlug: string | null; productName: string | null; batchId: string | null; batchCode: string | null; title: string; version: string; fileR2Key: string | null; externalUrl: string | null; publishedAt: Date; createdAt: Date; requiresLogin: boolean
}

async function queryDocuments(conditions: SQL[], locale = "en", allowPrivate = false, limit = 100): Promise<DocumentRecord[]> {
  const rows = await db.select({ id: documents.id, type: documents.type, productId: documents.productId, productSlug: products.slug, productName: productTranslations.name, batchId: documents.batchId, batchCode: batches.code, title: documents.title, version: documents.version, fileR2Key: documents.fileR2Key, externalUrl: documents.externalUrl, publishedAt: documents.publishedAt, createdAt: documents.createdAt, requiresLogin: documents.requiresLogin }).from(documents).leftJoin(products, eq(documents.productId, products.id)).leftJoin(productTranslations, and(eq(productTranslations.productId, products.id), eq(productTranslations.locale, locale))).leftJoin(batches, eq(documents.batchId, batches.id)).where(and(...conditions, sql`${locale} = ANY(${documents.displayLocales})`, lte(documents.publishedAt, new Date()), ...(allowPrivate ? [] : [eq(documents.requiresLogin, false)]))).orderBy(desc(documents.publishedAt)).limit(limit)
  return rows.filter((row) => isDocumentType(row.type)).map((row) => ({ ...row, type: row.type as DocumentType }))
}

export const getDocumentById = cache(async (id: string, locale = "en", allowPrivate = false) => (await queryDocuments([eq(documents.id, id)], locale, allowPrivate, 1))[0] ?? null)

export async function listRecentDocuments(opts: { limit?: number; type?: DocumentType; productId?: string; locale?: string } = {}) {
  return queryDocuments([...(opts.type ? [eq(documents.type, opts.type)] : []), ...(opts.productId ? [eq(documents.productId, opts.productId)] : [])], opts.locale ?? "en", false, opts.limit ?? 50)
}

export async function resolveDocumentUrl(doc: DocumentRecord): Promise<string | null> {
  // Private metadata is never sufficient to expose an external public URL.
  if (doc.requiresLogin) return doc.fileR2Key ? privateDocumentUrl(doc.fileR2Key) : null
  if (doc.externalUrl) {
    try { const url = new URL(doc.externalUrl); return url.protocol === "https:" ? url.toString() : null } catch { return null }
  }
  const base = process.env.R2_PUBLIC_URL ?? process.env.R2_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_R2_BASE_URL
  if (!base || !doc.fileR2Key || doc.fileR2Key.startsWith("/") || doc.fileR2Key.split("/").includes("..")) return null
  try { const url = new URL(base); if (url.protocol !== "https:") return null; return `${base.replace(/\/$/, "")}/${doc.fileR2Key.split("/").map(encodeURIComponent).join("/")}` } catch { return null }
}

export function listDocumentsForProductSlug(slug: string, locale = "en") { return queryDocuments([eq(products.slug, slug)], locale) }
export function listDocumentsForProduct(productId: string, locale = "en") { return queryDocuments([eq(documents.productId, productId)], locale) }
export function listDocumentsByType(types: DocumentType[], locale = "en") { return types.length ? queryDocuments([inArray(documents.type, types)], locale) : Promise.resolve([]) }
export function isDocumentType(value: string): value is DocumentType { return (DOCUMENT_TYPES as readonly string[]).includes(value) }
