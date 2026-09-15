/** Locales with message files. Add new locales here AND create messages/{locale}.json. */
export const locales = ["en", "fi", "de", "sv", "nl"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fi: "Suomi",
  de: "Deutsch",
  sv: "Svenska",
  nl: "Nederlands",
}

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  fi: "🇫🇮",
  de: "🇩🇪",
  sv: "🇸🇪",
  nl: "🇳🇱",
}

export const localeCurrencies: Record<Locale, string> = {
  en: "EUR",
  fi: "EUR",
  de: "EUR",
  sv: "SEK",
  nl: "EUR",
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
