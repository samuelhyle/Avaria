import { BrandBlock } from "@/components/home/BrandBlock"
import { RecordsScopeDiagram } from "@/components/media/ResearchDiagrams"
import { ProductCard } from "@/components/product/ProductCard"
import { Container } from "@/components/ui/Container"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import type { Locale } from "@/lib/products/types"
import { makePageMetadata } from "@/lib/seo/metadata"
import { Calculator, MessageCircle, MessagesSquare } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
export const generateMetadata = makePageMetadata("home", "/")
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const [products, e, r] = await Promise.all([
    getStorefrontCatalogue(),
    getTranslations("experience"),
    getTranslations("research"),
  ])
  const tasks = [
    { key: "Calc", href: "peptide-calculator", icon: Calculator },
    { key: "Assistant", href: "assistant", icon: MessageCircle },
    { key: "Community", href: "community", icon: MessagesSquare },
  ]
  return (
    <Container>
      <section className="grid items-center gap-8 py-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <BrandBlock locale={locale} />
        <div className="research-panel p-5 sm:p-7">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">
            {e("recordPreviewTitle")}
          </p>
          <h2 className="max-w-md text-2xl font-semibold leading-tight tracking-tight">
            {e("recordPreviewHeading")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{e("recordPreviewIntro")}</p>
          <RecordsScopeDiagram
            locale={locale}
            compact
            className="mt-5 border-0 bg-transparent p-0"
          />
          <Link
            href={`/${locale}/lab-tests`}
            className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-accent hover:underline underline-offset-4"
          >
            {r("methodology")} →
          </Link>
        </div>
      </section>
      <section className="border-t border-line py-9 sm:py-12">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{e("catalogueTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              {e("catalogueIntro")}
            </p>
          </div>
          <Link
            className="inline-flex min-h-10 items-center text-sm font-semibold text-accent hover:underline underline-offset-4"
            href={`/${locale}/shop`}
          >
            {r("browse")} →
          </Link>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.slug} product={product} locale={locale as Locale} />
          ))}
        </div>
      </section>
      <section className="border-t border-line py-9 sm:py-12">
        <h2 className="text-2xl font-semibold tracking-tight">{e("chooseTask")}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {tasks.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={`/${locale}/${href}`}
              className="group research-panel flex flex-col p-5 transition-colors hover:border-accent/50 sm:p-6"
            >
              <Icon aria-hidden className="mb-4 h-6 w-6 text-accent" />
              <h3 className="text-lg font-semibold group-hover:text-accent">
                {e(`home${key}Title` as never)}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                {e(`home${key}Body` as never)}
              </p>
              <span aria-hidden className="mt-4 text-accent">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </Container>
  )
}
