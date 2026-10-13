/**
 * Shared pricing rules. Imported by both server routes (authoritative) and
 * client components (display only — the server recomputes every total).
 *
 * Catalogue and delivery prices are gross (include VAT). Launch scope: Finland at 25.5%. OSS country rates
 * and B2B reverse-charge are deferred to post-launch.
 */

export const VAT_RATE = 0.255

/** Display label used in order summaries. */
export const VAT_LABEL = "25.5%"

/** Free EU shipping threshold in cents (€150). */
export const FREE_SHIPPING_THRESHOLD_CENTS = 15_000

export function computeVatCents(subtotalCents: number): number {
  return Math.round((subtotalCents * VAT_RATE) / (1 + VAT_RATE))
}

export function computeOrderTotals(
  subtotalCents: number,
  shippingCents: number,
): { vatCents: number; totalCents: number } {
  const totalCents = subtotalCents + shippingCents
  const vatCents = computeVatCents(totalCents)
  return { vatCents, totalCents }
}

export function computeShippingCents(subtotalCents: number, rateCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS || subtotalCents === 0 ? 0 : rateCents
}

export function isSupportedCheckoutCountry(country: string): boolean {
  return country.toUpperCase() === "FI"
}
