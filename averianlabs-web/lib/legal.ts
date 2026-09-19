/**
 * Company legal identity, surfaced in the footer. Driven by public env vars
 * (`NEXT_PUBLIC_LEGAL_*`) so non-engineers can update it without a redeploy
 * touching code.
 *
 * Fallbacks are intentionally neutral Finnish copy from raportti.md — never
 * expose "FI-PENDING" or "Address line pending" in production UI. The
 * production environment MUST set the env vars; until then, the user sees a
 * calm "rekisteröity yritys" line instead of obvious placeholder strings.
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
    businessId: process.env.NEXT_PUBLIC_LEGAL_BUSINESS_ID ?? "rekisteröity Suomessa",
    vatId: process.env.NEXT_PUBLIC_LEGAL_VAT_ID ?? "ALV-numero ilmoitetaan kuitissa",
    addressLine1: process.env.NEXT_PUBLIC_LEGAL_ADDRESS_LINE1 ?? "Osoite ilmoitetaan pian",
    addressLine2: process.env.NEXT_PUBLIC_LEGAL_ADDRESS_LINE2 ?? "Helsinki, Suomi",
    contactEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "hello@averianlabs.eu",
  }
}

export function formatVatId(vatId: string): string {
  // Strip spaces, normalise case — EU VAT IDs are alphanumeric.
  return vatId.replace(/\s+/g, "").toUpperCase()
}
