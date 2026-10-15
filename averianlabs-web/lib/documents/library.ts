import { DOCUMENT_TYPES, type DocumentType } from "./constants"

export type DocumentSearchParams = Record<string, string | string[] | undefined>
export interface DocumentLibraryFilters {
  q: string
  product: string
  sku: string
  batch: string
  type?: DocumentType
  page: number
}

/** Bound public URL input; never interpret a query value as document access. */
export function readDocumentFilters(query: DocumentSearchParams): DocumentLibraryFilters {
  const text = (key: string) =>
    typeof query[key] === "string" ? query[key].trim().slice(0, 150) : ""
  const type = text("type")
  return {
    q: text("q"),
    product: text("product"),
    sku: text("sku"),
    batch: text("batch"),
    type: (DOCUMENT_TYPES as readonly string[]).includes(type) ? (type as DocumentType) : undefined,
    page: Math.min(500, Math.max(1, Math.trunc(Number(text("page"))) || 1)),
  }
}

export function hasDocumentFilters(filters: DocumentLibraryFilters) {
  return Boolean(filters.q || filters.product || filters.sku || filters.batch || filters.type)
}

export function documentLibraryHref(locale: string, filters: DocumentLibraryFilters, page = 1) {
  const query = new URLSearchParams()
  for (const key of ["q", "product", "sku", "batch", "type"] as const) {
    if (filters[key]) query.set(key, filters[key])
  }
  if (page > 1) query.set("page", String(page))
  return `/${locale}/documents${query.size ? `?${query}` : ""}`
}

/** Product-wide documents apply to every variant; a batch document keeps its exact SKU. */
export function documentAppliesToSku(
  doc: { batchId: string | null; batchSku?: string | null },
  sku: string,
) {
  return doc.batchId === null || doc.batchSku === sku
}

export function literalSearchPattern(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`
}
