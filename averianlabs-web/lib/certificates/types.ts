import type { DocumentType } from "@/lib/documents/constants"

/** One assay row from a batch's certificate of analysis. */
export interface CertificateTest {
  id: string
  name: string
  method: string
  result: string
  spec: string | null
  pass: boolean
  performedAt: string
}

/**
 * A released batch, with the assay that was run on it and the certificate
 * document that reports it.
 *
 * This is the unit the storefront presents. A competitor lists a product, a
 * size and a purity percentage; a certificate has the method that produced
 * the number, the specification it was measured against, the laboratory that
 * ran it and the date it was run — and all of that belongs to one lot.
 */
export interface BatchCertificate {
  batchId: string
  batchCode: string
  productId: string
  productSlug: string
  productName: string
  productType: string | null
  category: string | null
  sku: string
  sizeValue: number
  sizeUnit: string
  hplcPurity: number
  endotoxinEUPerMg: number
  msConfirmed: boolean
  lab: string
  manufacturedAt: string
  expiresAt: string
  documentId: string | null
  documentTitle: string | null
  documentType: DocumentType | null
  documentUrl: string | null
  tests: CertificateTest[]
  /**
   * True when the lot was seeded locally as a demonstration record rather
   * than released by a supplier. It may be shown, but it is labelled: a
   * demonstration lot is never presented as a supplier's certificate.
   */
  demonstration: boolean
}

/**
 * Reviewers that mark a batch as a demonstration record.
 *
 * The local demo seed writes `local-demo-fixture`; the commerce test seed
 * writes `Automated test fixture`. Neither is a supplier, so neither may be
 * presented as one. A batch reviewed by anything else is treated as a real
 * reviewed lot.
 */
export const DEMONSTRATION_REVIEWERS = ["local-demo-fixture", "Automated test fixture"] as const

export function isDemonstrationBatch(reviewedBy: string | null | undefined): boolean {
  if (!reviewedBy) return false
  return (DEMONSTRATION_REVIEWERS as readonly string[]).includes(reviewedBy)
}

/**
 * A lot is publishable only when a certificate document for it is publicly
 * readable. A batch with assay numbers but no published document is internal
 * state, not evidence a reader can check.
 */
export function isPublishableCertificate(record: { documentUrl: string | null }): boolean {
  return Boolean(record.documentUrl)
}
