import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string; email?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "auth" })
  return { title: t("resetTitle"), robots: { index: false, follow: false } }
}

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { token, email } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations("auth")

  return (
    <Container size="narrow" className="py-16">
      <header className="mb-8">
        <Badge tone="accent" className="mb-3">
          {t("signIn")}
        </Badge>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("resetTitle")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("resetSubtitle")}</p>
      </header>
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 sm:p-8">
        {token && email ? (
          <ResetPasswordForm locale={locale} email={email} token={token} />
        ) : (
          <div className="space-y-4">
            <p role="alert" className="text-sm text-danger">
              {t("resetInvalid")}
            </p>
            <Link
              href={`/${locale}/forgot-password`}
              className="inline-block text-sm text-accent hover:underline"
            >
              {t("forgotTitle")}
            </Link>
          </div>
        )}
      </div>
    </Container>
  )
}
