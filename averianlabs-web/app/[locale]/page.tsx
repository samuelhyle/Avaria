import { CategoryTiles } from "@/components/home/CategoryTiles"
import { FeaturedProducts } from "@/components/home/FeaturedProducts"
import { StoreFaq } from "@/components/home/StoreFaq"
import { StoreHero } from "@/components/home/StoreHero"
import { StoreHowItWorks } from "@/components/home/StoreHowItWorks"
import { StoreNewsletter } from "@/components/home/StoreNewsletter"
import { StoreQuality } from "@/components/home/StoreQuality"
import { StoreValue } from "@/components/home/StoreValue"
import { TrustBar } from "@/components/store/TrustBar"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("home", "/")

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const products = await getStorefrontCatalogue()
  const buyable = products.filter((product) =>
    product.vials.some((vial) => vial.purchaseMode === "direct" && vial.stockQty > 0),
  )
  const featured = buyable.length > 0 ? buyable : products

  return (
    <>
      <StoreHero locale={locale} featured={featured} />
      <TrustBar />
      <CategoryTiles locale={locale} />
      <FeaturedProducts locale={locale} products={featured} limit={8} />
      <StoreValue />
      <StoreHowItWorks />
      <StoreQuality locale={locale} />
      <StoreFaq />
      <StoreNewsletter />
    </>
  )
}
