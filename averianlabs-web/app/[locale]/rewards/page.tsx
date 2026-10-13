import { ResearchInfoPage } from "@/components/product/ResearchInfoPage"
import { makePageMetadata } from "@/lib/seo/metadata"
export const generateMetadata = makePageMetadata("rewards", "/rewards")
export default async function RewardsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <ResearchInfoPage locale={locale} prefix="rewards" sections={[]} />
}
