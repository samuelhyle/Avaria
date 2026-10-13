import { ChromeIslands } from "@/components/layout/ChromeIslands"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { CatalogueProvider } from "@/components/product/CatalogueProvider"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"

/**
 * Composition shell. Header is interactive (cart/wishlist/compare stores),
 * Footer is async (server component for SSR'd i18n strings), ChromeIslands
 * holds the lazily-loaded modals / banners.
 *
 * The request-scoped database catalogue feeds client search, compare and cart
 * controls through one provider, keeping their SKU/unit data consistent.
 */
export async function Chrome({
  locale,
  children,
}: {
  locale: string
  children: React.ReactNode
}) {
  const products = await getStorefrontCatalogue()
  return (
    <CatalogueProvider products={products}>
      <Header locale={locale} />
      <main id="main" className="min-h-[calc(100vh-64px)]">
        {children}
      </main>
      <Footer locale={locale} />
      <ChromeIslands locale={locale} />
    </CatalogueProvider>
  )
}
