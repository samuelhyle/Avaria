import { PartnerApplicationForm } from "@/components/partner/PartnerApplicationForm"
import { Container } from "@/components/ui/Container"
import { makePageMetadata } from "@/lib/seo/metadata"
import { getTranslations, setRequestLocale } from "next-intl/server"
export const generateMetadata = makePageMetadata("partner", "/partner")
export default async function PartnerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("research")
  return (
    <Container className="py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <header>
          <h1 className="font-display text-4xl font-semibold">{t("partnerTitle")}</h1>
          <p className="mt-4 text-ink-muted">{t("partnerIntro")}</p>
        </header>
        <section className="rounded-[var(--radius-lg)] border border-line bg-surface p-6">
          <h2 className="mb-6 text-xl font-semibold">{t("partnerApply")}</h2>
          <PartnerApplicationForm />
        </section>
      </div>
    </Container>
  )
}
