import { ProductCard } from "@/components/product/ProductCard"
import { Section } from "@/components/ui/Section"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { toClientCatalogue } from "@/lib/products/client-catalogue"
import type { Locale, Product } from "@/lib/products/types"
import { buttonClasses } from "@/lib/ui/button-styles"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

/**
 * Best sellers. The first products are the catalogue's own ordering, so the
 * section always shows what the shop actually wants to push.
 */
export async function FeaturedProducts({
  locale,
  products,
  limit = 8,
  buyable = true,
}: {
  locale: string
  products: Product[]
  limit?: number
  /**
   * Whether anything in the catalogue can be bought today. The band says
   * "the materials our customers order most, with live stock and current
   * pricing" — which is a lie over a shelf of out-of-stock items, so it
   * says something else when that is the case.
   */
  buyable?: boolean
}) {
  const t = await getTranslations("home")
  const l = locale as Locale
  // The card is a client component, so every product it receives is
  // serialised into the page payload. Only the fields the card renders are
  // worth paying for.
  const shown = toClientCatalogue(products.slice(0, limit), l)

  if (shown.length === 0) return null

  return (
    <Section aria-labelledby="featured-title" tone="sunken">
      <SectionHeader
        eyebrow={buyable ? t("featuredEyebrow") : t("featuredEyebrowAlt")}
        title={buyable ? t("featuredTitle") : t("featuredTitleAlt")}
        titleId="featured-title"
        subtitle={buyable ? t("featuredSubtitle") : t("featuredSubtitleAlt")}
        action={
          <Link href={`/${locale}/shop`} className={buttonClasses({ variant: "secondary" })}>
            {t("featuredCta")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        }
      />

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((product) => (
          <li key={product.slug} className="min-w-0">
            <ProductCard product={product} locale={l} />
          </li>
        ))}
      </ul>
    </Section>
  )
}
