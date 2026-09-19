import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { users } from "@/db/schema"
import { consumeToken, tokenIdentifiers } from "@/lib/auth/tokens"
import { db, isDatabaseConfigured } from "@/lib/db"
import { eq } from "drizzle-orm"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string; email?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Email confirmation", robots: { index: false, follow: false } }
}

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { token, email: rawEmail } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations("auth")

  let state: "success" | "invalid" | "missing" | "unavailable" = "missing"
  if (!isDatabaseConfigured()) {
    state = "unavailable"
  } else if (token && rawEmail) {
    try {
      const email = rawEmail.trim().toLowerCase()
      const valid = await consumeToken(tokenIdentifiers.emailVerification(email), token)
      if (valid) {
        const updated = await db
          .update(users)
          .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(users.email, email))
          .returning({ id: users.id })
        state = updated.length > 0 ? "success" : "invalid"
      } else {
        state = "invalid"
      }
    } catch {
      state = "unavailable"
    }
  }

  const title =
    state === "success"
      ? t("verifySuccess")
      : state === "invalid"
        ? t("verifyInvalid")
        : state === "unavailable"
          ? "This deployment doesn't have a database configured."
          : t("verifyMissing")

  return (
    <Container size="narrow" className="py-16">
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center">
        {state === "success" ? (
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-success" />
        ) : (
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-warn" />
        )}
        <h1 className="font-display text-2xl font-semibold">{t("verifyTitle")}</h1>
        <p className="mt-3 text-sm text-ink-muted">{title}</p>
        <Link href={`/${locale}/account`} className="mt-6 inline-block">
          <Button variant="secondary" size="sm">
            {t("backToAccount")}
          </Button>
        </Link>
      </div>
    </Container>
  )
}
