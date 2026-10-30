import { ShopPageCatalog } from "@/components/shop/ShopCatalog"
import { TrustBar } from "@/components/store/TrustBar"
import { Container } from "@/components/ui/Container"
import { locales } from "@/lib/i18n/config"
import { CATEGORIES } from "@/lib/products/categories"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { Suspense } from "react"

// Static shell — filters/sorting/3D are handled by the client catalog island.
export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const meta = await getTranslations({ locale, namespace: "meta" })
  return {
    title: meta("shop.title"),
    description: meta("shop.description"),
    alternates: {
      canonical: `/${locale}/shop`,
      languages: Object.fromEntries(locales.map((language) => [language, `/${language}/shop`])),
    },
  }
}

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const [shop, categories] = await Promise.all([
    getTranslations("shop"),
    getTranslations("store.categories"),
  ])

  return (
    <>
      <div className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <h1 className="font-display text-balance text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {shop("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
            {shop("subtitle")}
          </p>

          <nav aria-label={shop("browseByCategory")} className="mt-6">
            <ul className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/${locale}/shop?category=${category.slug}`}
                    className="inline-flex h-9 items-center rounded-full border border-line bg-surface-2/60 px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent-ink"
                  >
                    {categories(`${category.slug}.name`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </div>

      <Container className="py-6 sm:py-8">
        <Suspense fallback={<ShopCatalogSkeleton />}>
          <ShopPageCatalog locale={locale} />
        </Suspense>
      </Container>

      <TrustBar />
    </>
  )
}

function ShopCatalogSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <div className="hidden h-96 animate-pulse rounded-[var(--radius-lg)] bg-surface-2 lg:block" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {["a", "b", "c", "d", "e", "f"].map((id) => (
          <div
            key={id}
            className="h-[26rem] animate-pulse rounded-2xl border border-line bg-surface-2"
          />
        ))}
      </div>
    </div>
  )
}
