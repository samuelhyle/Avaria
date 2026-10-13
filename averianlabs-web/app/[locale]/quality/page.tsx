import { ResearchInfoPage } from "@/components/product/ResearchInfoPage"
import { makePageMetadata } from "@/lib/seo/metadata"
import { setRequestLocale } from "next-intl/server"

export const generateMetadata = makePageMetadata("quality", "/quality")

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <ResearchInfoPage locale={locale} prefix="quality" sections={["Identity", "Reports", "Handling"]} />
}
