import { CategoryTiles } from "@/components/home/CategoryTiles"
import { FeaturedProducts } from "@/components/home/FeaturedProducts"
import { StoreFaq } from "@/components/home/StoreFaq"
import { StoreHero } from "@/components/home/StoreHero"
import { StoreHowItWorks } from "@/components/home/StoreHowItWorks"
import { StoreNewsletter } from "@/components/home/StoreNewsletter"
import { StoreQuality } from "@/components/home/StoreQuality"
import { StoreValue } from "@/components/home/StoreValue"
import { TrustBar } from "@/components/store/TrustBar"
import { getStorefrontCatalogue, storefrontProducts } from "@/lib/products/catalogue"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("home", "/")

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const products = await getStorefrontCatalogue()

  // The checkout fixture is a payment test, not a product: it has no goods,
  // no batch and no certificate, and it is the only thing in the catalogue
  // with a price. Left in, it became the store's flagship — the hero
  // rendered "Test vial — €1.50" and the featured row showed two test
  // products where a shopper expects the catalogue. It stays reachable at
  // its own address so the payment path can still be exercised, but it is
  // never what the front page shows.
  const sellable = storefrontProducts(products)
  const buyable = sellable.filter((product) =>
    product.vials.some((vial) => vial.purchaseMode === "direct" && vial.stockQty > 0),
  )
  // Prefer what can be bought today. When nothing can — which is the state
  // until the catalogue's batches carry their evidence — show the catalogue
  // itself rather than nothing: a page that lists the real products reads
  // as a shop, and each one says plainly that its price is on request.
  const featured = buyable.length > 0 ? buyable : sellable

  return (
    <>
      <StoreHero locale={locale} featured={featured} />
      <TrustBar />
      <CategoryTiles locale={locale} />
      <FeaturedProducts locale={locale} products={featured} limit={8} />
      <StoreValue />
      <StoreHowItWorks />
      <StoreQuality locale={locale} />
      <StoreFaq locale={locale} />
      <StoreNewsletter />
    </>
  )
}
