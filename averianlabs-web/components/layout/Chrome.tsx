import { ChromeIslands } from "@/components/layout/ChromeIslands"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"

/**
 * Composition shell. Header is interactive (cart/wishlist/compare stores),
 * Footer is async (server component for SSR'd i18n strings), ChromeIslands
 * holds the lazily-loaded modals / banners.
 *
 * The product catalog is imported directly by the client components that need
 * it instead of being serialized through the RSC payload on every page.
 */
export async function Chrome({
  locale,
  children,
}: {
  locale: string
  children: React.ReactNode
}) {
  return (
    <>
      <Header locale={locale} />
      <main id="main" className="min-h-[calc(100vh-64px)]">
        {children}
      </main>
      <Footer locale={locale} />
      <ChromeIslands locale={locale} />
    </>
  )
}
