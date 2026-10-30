export const dynamic = "force-dynamic"

import { Chrome } from "@/components/layout/Chrome"
import { DocumentHydrationGate } from "@/components/layout/DocumentHydrationGate"
import { MotionProvider } from "@/components/layout/MotionProvider"
import { PostHogProvider } from "@/components/layout/PostHogProvider"
import { ThemeProvider } from "@/components/layout/ThemeProvider"
import { VercelInsights } from "@/components/layout/VercelInsights"
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/JsonLd"
import { Toaster } from "@/components/ui/Toaster"
import { isDemoBuild } from "@/lib/demo"
import { clientNamespacesFor } from "@/lib/i18n/client-namespaces"
import { isLocale } from "@/lib/i18n/config"
import { sliceNamespace } from "@/lib/i18n/slice-messages"
import { siteOrigin, socialImagePath } from "@/lib/seo/site-origin"
import type { Metadata, Viewport } from "next"
import { NextIntlClientProvider, hasLocale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import "../../styles/globals.css"

export function generateStaticParams() {
  return ["en", "fi", "sv", "ru"].map((locale) => ({ locale }))
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
    metadataBase: new URL(siteOrigin()),
    manifest: `/${locale}/manifest.webmanifest`,
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
          url: isDemoBuild()
            ? `/og-default-${locale === "fi" ? "fi" : "en"}.svg`
            : socialImagePath("default", locale),
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
      images: [
        isDemoBuild()
          ? `/og-default-${locale === "fi" ? "fi" : "en"}.svg`
          : socialImagePath("default", locale),
      ],
    },
    robots:
      isDemoBuild() || process.env.NEXT_PUBLIC_REVIEW_SITE === "true"
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
        sv: "/sv",
        ru: "/ru",
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
  if (!hasLocale(["en", "fi", "sv", "ru"] as const, locale) || !isLocale(locale)) {
    notFound()
  }
  setRequestLocale(locale)

  const allMessages = (await import(`../../messages/${locale}.json`)).default as Record<
    string,
    unknown
  >
  // Only the namespaces this route actually renders in the browser are
  // serialised into the RSC payload. The shell set comes from the request
  // path, which the middleware forwards as a header.
  const pathname = (await headers()).get("x-pathname") ?? `/${locale}`
  const clientMessages = Object.fromEntries(
    clientNamespacesFor(pathname)
      .filter((ns) => ns in allMessages)
      .map((ns) => [ns, sliceNamespace(ns, allMessages[ns])]),
  )

  return (
    <DocumentHydrationGate>
      <head>
        {/*
          The brand face is the largest contentful paint on the home page, so
          the file is requested before the stylesheet is parsed. A dynamic
          route never emits the preload for a `next/font` face, so it is
          declared here against the stable URL in `public/fonts`.
        */}
        <link
          rel="preload"
          href="/fonts/geist-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <html lang={locale} suppressHydrationWarning>
        <body
          data-review-site={process.env.NEXT_PUBLIC_REVIEW_SITE === "true" ? "true" : undefined}
          className="min-h-screen bg-bg text-ink antialiased"
        >
          <ThemeProvider>
            <MotionProvider>
              <OrganizationJsonLd />
              <WebsiteJsonLd locale={locale} />
              <NextIntlClientProvider locale={locale} messages={clientMessages}>
                <Chrome locale={locale}>{children}</Chrome>
                <Suspense fallback={null}>
                  <PostHogProvider />
                </Suspense>
                <Toaster />
                <VercelInsights />
              </NextIntlClientProvider>
            </MotionProvider>
          </ThemeProvider>
        </body>
      </html>
    </DocumentHydrationGate>
  )
}
