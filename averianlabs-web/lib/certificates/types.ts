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

/**
 * Words that mark a record as a demonstration rather than supplier evidence.
 *
 * A record seeded before this rule existed still says what it is in its own
 * title or in the name of the laboratory that supposedly ran the assay. The
 * words are read from the record itself, so a lot cannot be passed off as a
 * supplier's certificate by being reviewed by the wrong account.
 */
const DEMONSTRATION_WORDS = /fixture|demonstration|demo record|sample record/i

export function isDemonstrationBatch(reviewedBy: string | null | undefined): boolean {
  if (!reviewedBy) return false
  if ((DEMONSTRATION_REVIEWERS as readonly string[]).includes(reviewedBy)) return true
  return DEMONSTRATION_WORDS.test(reviewedBy)
}

/**
 * Whether a certificate is a demonstration record.
 *
 * The reviewer, the document title and the laboratory are all checked: a
 * record that says in any of them that it is a fixture is one.
 */
export function isDemonstrationCertificate(record: {
  reviewedBy: string | null | undefined
  documentTitle?: string | null
  lab?: string | null
}): boolean {
  if (isDemonstrationBatch(record.reviewedBy)) return true
  if (record.documentTitle && DEMONSTRATION_WORDS.test(record.documentTitle)) return true
  if (record.lab && DEMONSTRATION_WORDS.test(record.lab)) return true
  return false
}

/**
 * A lot is publishable only when a certificate document for it is publicly
 * readable. A batch with assay numbers but no published document is internal
 * state, not evidence a reader can check.
 */
export function isPublishableCertificate(record: { documentUrl: string | null }): boolean {
  return Boolean(record.documentUrl)
}
