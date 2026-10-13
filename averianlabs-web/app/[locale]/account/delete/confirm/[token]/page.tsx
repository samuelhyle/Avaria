export const dynamic = "force-dynamic"

import { ConfirmDelete } from "@/components/account/ConfirmDelete"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { gdprRequests } from "@/db/schema"
import { getCurrentMember } from "@/lib/community"
import { db } from "@/lib/db"
import { and, eq, gt } from "drizzle-orm"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ locale: string; token: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Confirm deletion · Account", robots: { index: false, follow: false } }
}

export default async function ConfirmDeletePage({ params }: Props) {
  const { locale, token } = await params
  setRequestLocale(locale)
  const t = await getTranslations("gdpr")
  const r = await getTranslations("research")
  const member = await getCurrentMember()

  // Find the pending request matching this token.
  const [request] = await db
    .select()
    .from(gdprRequests)
    .where(
      and(
        eq(gdprRequests.token, token),
        eq(gdprRequests.kind, "delete"),
        gt(gdprRequests.tokenExpiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!request) notFound()
  if (!member || member.id !== request.userId) {
    return (
      <Container size="narrow" className="py-16">
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-warn" />
          <h1 className="text-xl font-semibold text-ink">{r("signInConfirm")}</h1>
          <p className="mt-2 text-sm text-ink-muted">{r("signInConfirm")}</p>
          <Link
            href={`/${locale}/account`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            ← {r("signInConfirm")}
          </Link>
        </div>
      </Container>
    )
  }

  return (
    <Container size="narrow" className="py-16">
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-success" />
        <Badge tone="success" size="sm" className="mb-3">
          {t("deleteTitle")}
        </Badge>
        <h1 className="text-2xl font-semibold text-ink">{t("deleteTitle")}</h1>
        <p className="mt-3 text-sm text-ink-muted">{t("deleteDescription")}</p>
        <p className="mt-4 text-xs text-ink-subtle">{r("deletionImmediate")}</p>
        <ConfirmDelete token={token} />
        <Link href={`/${locale}`} className="mt-6 inline-block text-sm text-accent hover:underline">
          ← {r("home")}
        </Link>
      </div>
    </Container>
  )
}
