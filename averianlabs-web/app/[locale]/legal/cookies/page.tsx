import { PolicyPage } from "@/components/product/PolicyPage"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("legalCookies", "/legal/cookies")
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <PolicyPage locale={locale} kind="cookies" sections={["Essential", "Analytics", "Choice"]} />
  )
}
