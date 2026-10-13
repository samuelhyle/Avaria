/**
 * Map the app's short locale codes (en, fi, de, sv, nl) to the BCP-47 tags
 * used by `Intl.*`. The short codes work for some operations (German
 * currency), but fall back to a non-default region for others (e.g. "en"
 * would fall back to the system default, not en-GB). Mapping the short
 * codes to canonical tags keeps currency, number and date formatting
 * consistent across the app.
 */
export function toIntlLocale(locale: string): string {
  switch (locale) {
    case "en":
      return "en-GB"
    case "fi":
      return "fi-FI"
    case "de":
      return "de-DE"
    case "sv":
      return "sv-SE"
    case "nl":
      return "nl-NL"
    default:
      return locale
  }
}

export function formatCurrency(cents: number, currency = "EUR", locale = "en-GB"): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatNumber(value: number, locale = "en-GB"): string {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(value)
}

/** Quantities are not necessarily masses: never infer a unit from the product name. */
export function formatSize(size: { sizeValue: number; sizeUnit: string }, locale = "en"): string {
  const unit = size.sizeUnit === "uL" ? "µL" : size.sizeUnit === "mcg" ? "µg" : size.sizeUnit
  return `${formatNumber(size.sizeValue, locale)} ${unit}`
}

export function formatPercent(value: number, locale = "en"): string {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value / 100)
}

export function formatDate(date: Date | string, locale = "en-GB"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
