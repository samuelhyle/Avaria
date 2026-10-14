import { BrandBlock } from "@/components/home/BrandBlock"
import { Hero3D } from "@/components/home/Hero3D"
import { ProductCard } from "@/components/product/ProductCard"
import { Container } from "@/components/ui/Container"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import type { Locale } from "@/lib/products/types"
import { makePageMetadata } from "@/lib/seo/metadata"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
export const generateMetadata = makePageMetadata("home", "/")
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const [products, t, r] = await Promise.all([
    getStorefrontCatalogue(),
    getTranslations("home"),
    getTranslations("research"),
  ])
  return (
    <>
      <Container>
        <section className="grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <BrandBlock locale={locale} />
          <Hero3D
            products={products.filter((p) => p.productType !== "supplies").slice(0, 1)}
            locale={locale}
          />
        </section>
        <ol className="mb-10 grid overflow-hidden rounded-xl border border-line bg-surface sm:grid-cols-3">
          {["find", "documents", "confirm"].map((step, i) => (
            <li key={step} className="flex gap-3 border-line p-5 sm:border-r last:border-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-xs font-semibold text-accent">
                {i + 1}
              </span>
              <div>
                <h2 className="text-sm font-semibold">{r(`step${step}` as never)}</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {r(`step${step}Body` as never)}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <section className="mb-12">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{t("threeDHeading")}</h2>
              <p className="mt-2 text-sm text-ink-muted">{t("threeDSub")}</p>
            </div>
            <Link className="text-sm font-medium text-accent" href={`/${locale}/shop`}>
              {r("browse")} →
            </Link>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.slug} product={p} locale={locale as Locale} />
            ))}
          </div>
        </section>
        <section className="grid gap-5 border-t border-line py-10 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{r("qualityTitle")}</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-muted">
              {r("qualityIntro")}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-accent">
              <Link href={`/${locale}/coa`}>{r("viewDocuments")} →</Link>
              <Link href={`/${locale}/lab-tests`}>{r("methodology")} →</Link>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-lg font-semibold">{r("tools")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{r("toolsIntro")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-9 items-center rounded-lg border border-accent/40 px-3 text-sm font-medium text-accent hover:bg-accent-soft"
                href={`/${locale}/peptide-calculator`}
              >
                {r("calculator")}
              </Link>
              <Link
                className="inline-flex min-h-9 items-center rounded-lg border border-accent/40 px-3 text-sm font-medium text-accent hover:bg-accent-soft"
                href={`/${locale}/community`}
              >
                {r("communityTitle")}
              </Link>
            </div>
          </div>
        </section>
      </Container>
    </>
  )
}
