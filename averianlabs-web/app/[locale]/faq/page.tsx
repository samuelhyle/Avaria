import { ProductFAQ } from "@/components/product/ProductFAQ"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("faq", "/faq")
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <Container className="py-16">
      <ProductFAQ />
    </Container>
  )
}
