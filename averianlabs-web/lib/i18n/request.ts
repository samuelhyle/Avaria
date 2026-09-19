import { getRequestConfig } from "next-intl/server"
import { notFound } from "next/navigation"
import { type Locale, defaultLocale, isLocale } from "./config"

type LocaleMessages = Record<string, unknown>
type LocaleMessageValue = string | LocaleMessages

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale: Locale = requested && isLocale(requested) ? requested : defaultLocale

  let messages: LocaleMessages = {}
  try {
    messages = (await import(`../../messages/${locale}.json`)).default as LocaleMessages
  } catch {
    if (locale !== defaultLocale) notFound()
  }

  // Fall back to English strings when a locale is missing keys — keeps pages
  // rendering while translations are still being authored in non-en locales.
  let englishMessages: LocaleMessages = {}
  if (locale !== defaultLocale) {
    try {
      englishMessages = (await import(`../../messages/${defaultLocale}.json`))
        .default as LocaleMessages
    } catch {
      // ignore — fallback disabled
    }
  }

  return {
    locale,
    messages,
    timeZone: "Europe/Helsinki",
    // Intentionally no `now` — supplying it forces every render to be dynamic,
    // which defeats ISR for product / category / blog pages.
    formats: {
      dateTime: {
        short: { day: "numeric", month: "short", year: "numeric" },
        medium: {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
        long: {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      },
      number: {
        precise: { maximumFractionDigits: 2 },
        currency: { style: "currency", currency: "EUR" },
      },
    },
    // Swallow MISSING_MESSAGE noise in dev — getMessageFallback handles UX.
    onError: () => {},
    // Tell next-intl to use English strings instead of throwing when a key
    // is missing in the current locale — local dev with partial translations.
    getMessageFallback: ({ key, namespace, error }) => {
      const fullKey = namespace ? `${namespace}.${key}` : key
      const fallback =
        lookupMessage(englishMessages, fullKey) ?? lookupMessage(englishMessages, key)
      if (process.env.NODE_ENV !== "production" && typeof console !== "undefined") {
        const code = error && "code" in error ? error.code : "?"
        // eslint-disable-next-line no-console
        console.warn(`[i18n fallback] ${locale}.${fullKey} (${code})`)
      }
      return typeof fallback === "string" ? fallback : fullKey
    },
  }
})

/** Resolve a dot-separated key against a nested message object. */
function lookupMessage(messages: LocaleMessages, path: string): LocaleMessageValue {
  return path.split(".").reduce<LocaleMessageValue>((acc, part): LocaleMessageValue => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as LocaleMessages)[part] as LocaleMessageValue
    }
    return "" as LocaleMessageValue
  }, messages)
}
