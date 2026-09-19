import type { Locale } from "@/lib/i18n/config"

const LOCALE_TAG: Record<Locale, string> = {
  en: "en-GB",
  fi: "fi-FI",
  de: "de-DE",
  sv: "sv-SE",
  nl: "nl-NL",
}

export function localeTag(locale: Locale): string {
  return LOCALE_TAG[locale] ?? "en-GB"
}

export function formatCurrency(
  cents: number,
  currency = "EUR",
  locale: Locale | string = "en-GB",
): string {
  const tag =
    typeof locale === "string" && (locale as Locale) in LOCALE_TAG
      ? localeTag(locale as Locale)
      : locale
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatNumber(value: number, locale: Locale | string = "en-GB"): string {
  const tag =
    typeof locale === "string" && (locale as Locale) in LOCALE_TAG
      ? localeTag(locale as Locale)
      : locale
  return new Intl.NumberFormat(tag).format(value)
}

/**
 * Finnish: "99,4 %" (comma decimal, space before %).
 * Other locales fall back to en-GB.
 */
export function formatPercent(value: number, locale: Locale | string = "en-GB"): string {
  const tag =
    typeof locale === "string" && (locale as Locale) in LOCALE_TAG
      ? localeTag(locale as Locale)
      : locale
  return new Intl.NumberFormat(tag, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

/**
 * Finnish: "18.7.2026". en-GB: "18 Jul 2026".
 */
export function formatDate(date: Date | string, locale: Locale | string = "en-GB"): string {
  const d = typeof date === "string" ? new Date(date) : date
  const tag =
    typeof locale === "string" && (locale as Locale) in LOCALE_TAG
      ? localeTag(locale as Locale)
      : locale
  return new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}
