import { LazyChatWidget } from "@/components/ai/chat/LazyChatWidget"
import { ChromeIslands } from "@/components/layout/ChromeIslands"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { CatalogueProvider } from "@/components/product/CatalogueProvider"
import { isDemoBuild } from "@/lib/demo"
import { getFooterContent } from "@/lib/layout/footer-content"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { toClientCatalogue } from "@/lib/products/client-catalogue"
import type { Locale } from "@/lib/products/types"

/**
 * Composition shell. Header is interactive (cart/wishlist/compare stores),
 * Footer receives resolved server copy for synchronous SSR, ChromeIslands
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
  const [products, footerContent] = await Promise.all([
    getStorefrontCatalogue(),
    getFooterContent(locale),
  ])
  return (
    // Only the fields the browser reads are serialised. The full catalogue
    // stays on the server, where the product pages render it.
    <CatalogueProvider products={toClientCatalogue(products, locale as Locale)}>
      <Header locale={locale} />
      <main id="main" className="min-h-[calc(100vh-64px)]">
        {children}
      </main>
      <Footer content={footerContent} />
      <ChromeIslands locale={locale} />
      <LazyChatWidget locale={locale} demoMode={isDemoBuild()} />
    </CatalogueProvider>
  )
}
