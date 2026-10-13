import { PolicyPage } from "@/components/product/PolicyPage"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("shippingReturns", "/support/shipping-returns")
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <PolicyPage locale={locale} kind="shipping" sections={["Rates", "Handling", "Returns"]} />
}
