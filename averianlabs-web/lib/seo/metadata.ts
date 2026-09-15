import { locales as supportedLocales } from "@/lib/i18n/config"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

type SeoKey =
  | "home"
  | "about"
  | "contact"
  | "faq"
  | "labTests"
  | "coa"
  | "compare"
  | "calculator"
  | "quality"
  | "partner"
  | "rewards"
  | "wishlist"
  | "shippingReturns"
  | "legalCookies"
  | "legalPrivacy"
  | "legalResearchDisclaimer"
  | "legalTerms"

function isSupportedLocale(value: string): value is (typeof supportedLocales)[number] {
  return (supportedLocales as readonly string[]).includes(value)
}

/**
 * Build a `generateMetadata` object for a static page whose title and
 * description live under the `meta.{key}` namespace across all 5 locales.
 *
 * Usage:
 *   export const generateMetadata = makePageMetadata("about", "/about");
 */
export function makePageMetadata(key: SeoKey, path?: string) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>
  }): Promise<Metadata> {
    const { locale } = await params
    if (!isSupportedLocale(locale)) {
      return {}
    }
    const t = await getTranslations({ locale, namespace: "meta" })
    const url = path ? `/${locale}${path}` : `/${locale}`
    return {
      title: t(`${key}.title` as const),
      description: t(`${key}.description` as const),
      alternates: {
        canonical: url,
        languages: Object.fromEntries(supportedLocales.map((l) => [l, `/${l}${path ?? ""}`])),
      },
    }
  }
}
