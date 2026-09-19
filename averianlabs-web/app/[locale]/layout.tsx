import { LazyChatWidget } from "@/components/ai/chat/LazyChatWidget"
import { Chrome } from "@/components/layout/Chrome"
import { MotionProvider } from "@/components/layout/MotionProvider"
import { PostHogProvider } from "@/components/layout/PostHogProvider"
import { ThemeProvider } from "@/components/layout/ThemeProvider"
import { VercelInsights } from "@/components/layout/VercelInsights"
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/JsonLd"
import { Toaster } from "@/components/ui/Toaster"
import { isDemoBuild } from "@/lib/demo"
import { isLocale } from "@/lib/i18n/config"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata, Viewport } from "next"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import "../../styles/globals.css"

/**
 * Namespaces consumed by client components (`useTranslations`) across the app.
 * The full locale file (~21 KB) used to be serialized into every page's RSC
 * payload; server components keep using the complete request-scoped messages.
 * Keep this list in sync when adding a namespace to a client component.
 */
const CLIENT_NAMESPACES = [
  "account",
  "admin",
  "ageGate",
  "auth",
  "averia",
  "calculator",
  "cart",
  "checkout",
  "common",
  "community",
  "contact",
  "cookie",
  "gdpr",
  "home",
  "nav",
  "newsletter",
  "notifications",
  "plans",
  "product",
  "shop",
] as const

export function generateStaticParams() {
  return ["en", "fi", "de", "sv", "nl"].map((locale) => ({ locale }))
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfcfe" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
  ],
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "meta" })
  return {
    metadataBase: new URL("https://averianlabs.eu"),
    title: { default: t("title"), template: "%s · AverianLabs" },
    description: t("description"),
    keywords: t("keywords").split(","),
    authors: [{ name: "AverianLabs" }],
    creator: "AverianLabs",
    publisher: "AverianLabs",
    formatDetection: { email: false, address: false, telephone: false },
    openGraph: {
      type: "website",
      locale,
      url: `/${locale}`,
      siteName: "AverianLabs",
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: isDemoBuild() ? "/og-default.svg" : "/api/og/default",
          width: 1200,
          height: 630,
          alt: t("title"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [isDemoBuild() ? "/og-default.svg" : "/api/og/default"],
    },
    robots: isDemoBuild()
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        fi: "/fi",
        de: "/de",
        sv: "/sv",
        nl: "/nl",
      },
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(["en", "fi", "de", "sv", "nl"] as const, locale) || !isLocale(locale)) {
    notFound()
  }
  setRequestLocale(locale)

  const allMessages = (await import(`../../messages/${locale}.json`)).default as Record<
    string,
    unknown
  >
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((ns) => ns in allMessages).map((ns) => [ns, allMessages[ns]]),
  )

  return (
    <html
      lang={locale}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg text-ink antialiased">
        <ThemeProvider>
          <MotionProvider>
            <OrganizationJsonLd />
            <WebsiteJsonLd />
            <NextIntlClientProvider locale={locale} messages={clientMessages}>
              <Chrome locale={locale}>{children}</Chrome>
              <Suspense fallback={null}>
                <PostHogProvider />
              </Suspense>
              <Toaster />
              <LazyChatWidget locale={locale} demoMode={isDemoBuild()} />
              <VercelInsights />
            </NextIntlClientProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
