export const dynamic = "force-dynamic"

import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { newsletterSubscribers } from "@/db/schema"
import { hashToken } from "@/lib/auth/tokens"
import { db } from "@/lib/db"
import { and, eq, gt } from "drizzle-orm"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string; email?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Newsletter", robots: { index: false, follow: false } }
}

export default async function NewsletterConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { token, email: rawEmail } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations("newsletter")

  let state: "success" | "invalid" | "missing" = "missing"
  if (token && rawEmail) {
    const email = rawEmail.trim().toLowerCase()
    const [subscriber] = await db
      .select({ id: newsletterSubscribers.id })
      .from(newsletterSubscribers)
      .where(
        and(
          eq(newsletterSubscribers.email, email),
          eq(newsletterSubscribers.confirmToken, hashToken(token)),
          eq(newsletterSubscribers.status, "pending"),
          gt(newsletterSubscribers.confirmExpiresAt, new Date()),
        ),
      )
      .limit(1)

    if (subscriber) {
      await db
        .update(newsletterSubscribers)
        .set({
          status: "confirmed",
          confirmedAt: new Date(),
          confirmToken: null,
          confirmExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(newsletterSubscribers.id, subscriber.id))
      state = "success"
    } else {
      state = "invalid"
    }
  }

  const message =
    state === "success"
      ? t("confirmSuccess")
      : state === "invalid"
        ? t("confirmInvalid")
        : t("confirmMissing")

  return (
    <Container size="narrow" className="py-16">
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center">
        {state === "success" ? (
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-success" />
        ) : (
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-warn" />
        )}
        <h1 className="font-display text-2xl font-semibold">{t("confirmTitle")}</h1>
        <p className="mt-3 text-sm text-ink-muted">{message}</p>
        <Link href={`/${locale}`} className="mt-6 inline-block">
          <Button variant="secondary" size="sm">
            ← Home
          </Button>
        </Link>
      </div>
    </Container>
  )
}
