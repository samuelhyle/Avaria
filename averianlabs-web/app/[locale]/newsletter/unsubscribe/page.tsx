export const dynamic = "force-dynamic"

import { UnsubscribeForm } from "@/components/newsletter/unsubscribe-form"
import { Container } from "@/components/ui/Container"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "newsletter" })
  return { title: t("unsubscribeTitle"), robots: { index: false, follow: false } }
}

export default async function NewsletterUnsubscribePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "newsletter" })
  return (
    <Container size="narrow" className="py-16">
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8">
        <h1 className="font-display text-2xl font-semibold">{t("unsubscribeTitle")}</h1>
        <p className="mt-3 text-sm text-ink-muted">{t("unsubscribeBody")}</p>
        <div className="mt-6">
          <UnsubscribeForm locale={locale} />
        </div>
      </div>
    </Container>
  )
}
