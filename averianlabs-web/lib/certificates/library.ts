import { literalSearchPattern } from "@/lib/documents/library"

export type CertificateSearchParams = Record<string, string | string[] | undefined>

export interface CertificateFilters {
  q: string
  product: string
  sku: string
  batch: string
  lab: string
  minPurity: number | null
  page: number
}

export const CERTIFICATE_PAGE_SIZE = 20

/** Bound public URL input; a query value is never interpreted as a filter of any other kind. */
export function readCertificateFilters(query: CertificateSearchParams): CertificateFilters {
  const text = (key: string) =>
    typeof query[key] === "string" ? query[key].trim().slice(0, 150) : ""
  const purity = Number(text("minPurity"))
  return {
    q: text("q"),
    product: text("product"),
    sku: text("sku"),
    batch: text("batch"),
    lab: text("lab"),
    minPurity: Number.isFinite(purity) && purity > 0 && purity <= 100 ? purity : null,
    page: Math.min(500, Math.max(1, Math.trunc(Number(text("page"))) || 1)),
  }
}

export function hasCertificateFilters(filters: CertificateFilters) {
  return Boolean(
    filters.q ||
      filters.product ||
      filters.sku ||
      filters.batch ||
      filters.lab ||
      filters.minPurity !== null ||
      filters.page > 1,
  )
}

export function certificateLibraryHref(locale: string, filters: CertificateFilters, page = 1) {
  const query = new URLSearchParams()
  for (const key of ["q", "product", "sku", "batch", "lab"] as const) {
    if (filters[key]) query.set(key, filters[key])
  }
  if (filters.minPurity !== null) query.set("minPurity", String(filters.minPurity))
  if (page > 1) query.set("page", String(page))
  return `/${locale}/certificates${query.size ? `?${query}` : ""}`
}

/** The searchable text of one certificate, used by the free-text filter. */
export function certificateSearchText(certificate: {
  productSlug: string
  productName: string
  batchCode: string
  sku: string
  lab: string
}) {
  return [
    certificate.productSlug,
    certificate.productName,
    certificate.batchCode,
    certificate.sku,
    certificate.lab,
  ]
    .join(" ")
    .toLowerCase()
}

/** Match a free-text term against the searchable text of a certificate. */
export function matchesCertificateTerm(
  certificate: Parameters<typeof certificateSearchText>[0],
  term: string,
) {
  const needle = term.trim().toLowerCase()
  if (!needle) return true
  return certificateSearchText(certificate).includes(needle)
}

/** Match a term against one field only. */
export function matchesCertificateField(value: string | null | undefined, term: string) {
  const needle = term.trim().toLowerCase()
  if (!needle) return true
  if (!value) return false
  return value.toLowerCase().includes(needle)
}

export { literalSearchPattern }
