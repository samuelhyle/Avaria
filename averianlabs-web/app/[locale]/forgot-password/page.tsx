import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "auth" })
  return { title: t("forgotTitle"), robots: { index: false, follow: false } }
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("auth")

  return (
    <Container size="narrow" className="py-16">
      <header className="mb-8">
        <Badge tone="accent" className="mb-3">
          {t("signIn")}
        </Badge>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("forgotTitle")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("forgotSubtitle")}</p>
      </header>
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 sm:p-8">
        <ForgotPasswordForm locale={locale} />
      </div>
    </Container>
  )
}
