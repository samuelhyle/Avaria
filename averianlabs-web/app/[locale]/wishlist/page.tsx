import { WishlistView } from "@/components/product/WishlistView"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { getTranslations, setRequestLocale } from "next-intl/server"
export const generateMetadata = makePageMetadata("wishlist", "/wishlist")
export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("research")
  return (
    <Container className="py-12">
      <h1 className="font-display text-4xl font-semibold">{t("wishlist")}</h1>
      <p className="mt-4 mb-8 text-ink-muted">{t("savedIntro")}</p>
      <WishlistView locale={locale} />
    </Container>
  )
}
