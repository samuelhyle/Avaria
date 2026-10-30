/**
 * Locales with message files. Add new locales here AND create messages/{locale}.json.
 *
 * AverianLabs ships to Finland only, so the storefront speaks the languages
 * its customers actually read: Finnish, Swedish (the other official language
 * of Finland), Russian and English. Currency is EUR for every locale.
 */
export const locales = ["en", "fi", "sv", "ru"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fi: "Suomi",
  sv: "Svenska",
  ru: "Русский",
}

/**
 * Language names written in their own language, used inside the locale
 * switcher so a Finnish speaker can find "Suomi" the way they expect.
 */
export const localeNativeLabels: Record<Locale, string> = {
  en: "English",
  fi: "Suomi",
  sv: "Svenska",
  ru: "Русский",
}

export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  fi: "🇫🇮",
  sv: "🇸🇪",
  ru: "🇷🇺",
}

/**
 * Finland-only shipping means one currency. The map stays so a future
 * multi-country storefront can add regions without touching call sites.
 */
export const localeCurrencies: Record<Locale, string> = {
  en: "EUR",
  fi: "EUR",
  sv: "EUR",
  ru: "EUR",
}

/** RTL locales — none today, kept so the layout code stays honest. */
export const rtlLocales: readonly Locale[] = []

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
