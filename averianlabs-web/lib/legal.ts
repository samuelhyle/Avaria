/**
 * Company legal identity, surfaced in the footer. Driven by public env vars
 * (`NEXT_PUBLIC_LEGAL_*`) so non-engineers can update it without a redeploy
 * touching code — but they must be set before production traffic or the
 * footer falls back to obvious placeholders.
 */
export interface LegalIdentity {
  companyName: string
  businessId: string
  vatId: string
  addressLine1: string
  addressLine2: string
  contactEmail: string
}

export function getLegalIdentity(): LegalIdentity {
  return {
    companyName: process.env.NEXT_PUBLIC_LEGAL_COMPANY_NAME ?? "AverianLabs Oy",
    businessId: process.env.NEXT_PUBLIC_LEGAL_BUSINESS_ID ?? "FI-PENDING",
    vatId: process.env.NEXT_PUBLIC_LEGAL_VAT_ID ?? "FI-PENDING",
    addressLine1: process.env.NEXT_PUBLIC_LEGAL_ADDRESS_LINE1 ?? "Address line pending",
    addressLine2: process.env.NEXT_PUBLIC_LEGAL_ADDRESS_LINE2 ?? "Helsinki, Finland",
    contactEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "hello@averianlabs.eu",
  }
}

export function formatVatId(vatId: string): string {
  // Strip spaces, normalise case — EU VAT IDs are alphanumeric.
  return vatId.replace(/\s+/g, "").toUpperCase()
}
