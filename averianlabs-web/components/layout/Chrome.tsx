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
  const [catalogue, footerContent] = await Promise.all([
    getStorefrontCatalogue(),
    getFooterContent(locale),
  ])

  /**
   * The payment fixture is not merchandise.
   *
   * It exists to exercise the checkout path on the live site: no goods, no
   * batch, no certificate, no shipment, and a €1.50 price. Left in the
   * catalogue the browser sees, it appeared in the shop grid, in the search
   * results, in the command palette and in the cart's recommendations — and
   * on a catalogue whose own products are still awaiting their evidence, it
   * was the only thing on sale.
   *
   * It is dropped here, once, at the one place the browser's catalogue is
   * built. The product page itself still resolves, so the payment path can
   * still be tested by opening the fixture's own address.
   */
  const products = toClientCatalogue(
    catalogue.filter((product) => !product.checkoutTest),
    locale as Locale,
  )

  return (
    // Only the fields the browser reads are serialised. The full catalogue
    // stays on the server, where the product pages render it.
    <CatalogueProvider products={products}>
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
