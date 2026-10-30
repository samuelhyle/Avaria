import { ProductCard } from "@/components/product/ProductCard"
import { Container } from "@/components/ui/Container"
import { toClientCatalogue } from "@/lib/products/client-catalogue"
import type { Locale, Product } from "@/lib/products/types"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

/**
 * Best sellers. The first four products are the catalogue's own ordering,
 * so the section always shows what the shop actually wants to push.
 */
export async function FeaturedProducts({
  locale,
  products,
  limit = 8,
}: {
  locale: string
  products: Product[]
  limit?: number
}) {
  const t = await getTranslations("home")
  const l = locale as Locale
  // The card is a client component, so every product it receives is
  // serialised into the page payload. Only the fields the card renders are
  // worth paying for.
  const shown = toClientCatalogue(products.slice(0, limit), l)

  if (shown.length === 0) return null

  return (
    <section
      aria-labelledby="featured-title"
      className="border-y border-line bg-surface-2/60 py-12 sm:py-16"
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-accent">
              {t("featuredEyebrow")}
            </p>
            <h2
              id="featured-title"
              className="mt-2 text-balance font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              {t("featuredTitle")}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              {t("featuredSubtitle")}
            </p>
          </div>
          <Link
            href={`/${locale}/shop`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius)] border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-accent/40 hover:text-accent"
          >
            {t("featuredCta")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((product) => (
            <li key={product.slug} className="min-w-0">
              <ProductCard product={product} locale={l} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
