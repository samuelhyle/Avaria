/**
 * Document-type constants and labels. Safe to import from client components —
 * no database or server-only deps.
 */

export const DOCUMENT_TYPES = ["coa", "sds", "hplc", "method", "nmr", "spec", "msds"] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  coa: "Certificate of Analysis",
  sds: "Safety Data Sheet",
  hplc: "HPLC Trace",
  method: "Method Statement",
  nmr: "NMR Spectrum",
  spec: "Product Specification",
  msds: "Material Safety Data Sheet",
}

export const DOCUMENT_TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  coa: "Verifies purity, identity, endotoxin, mass-spec confirmation for the specific batch.",
  sds: "Hazard identification, handling, storage, and disposal information.",
  hplc: "Raw chromatogram showing the purity profile of the batch.",
  method: "Detailed analytical method used to characterise the product.",
  nmr: "Nuclear magnetic resonance spectrum confirming molecular structure.",
  spec: "Product specification sheet — appearance, purity, storage, handling.",
  msds: "Legacy material safety data sheet (now consolidated under SDS).",
}
