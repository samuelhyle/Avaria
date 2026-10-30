import { ProductFAQ } from "@/components/product/ProductFAQ"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { siteOrigin } from "@/lib/seo/site-origin"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("faq", "/faq")
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <Container className="py-16">
      <ProductFAQ pageUrl={`${siteOrigin()}/${locale}/faq`} />
    </Container>
  )
}
