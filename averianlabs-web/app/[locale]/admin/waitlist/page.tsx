export const dynamic = "force-dynamic"

import { AdminShell, ForbiddenShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getAdminOrNull } from "@/lib/admin"
import { countWaitlistEntries, listWaitlistEntries } from "@/lib/admin/waitlist"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Availability list · Admin", robots: { index: false, follow: false } }
}

export default async function AdminWaitlistPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("admin")
  const member = await getAdminOrNull()
  if (!member) {
    return (
      <Container size="narrow" className="py-16">
        <ForbiddenShell />
      </Container>
    )
  }
  const counts = await countWaitlistEntries()
  const entries = await listWaitlistEntries(200, "open")
  return (
    <AdminShell member={member}>
      <Container className="py-10">
        <header className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("waitlist")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("waitlistUi.subtitle")}</p>
          <p className="mt-2 text-xs text-ink-subtle">
            {t("waitlistUi.counts", { open: counts.open, notified: counts.notified })}
          </p>
        </header>

        {entries.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center text-sm text-ink-muted">
            {t("waitlistUi.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-2xs uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("waitlistUi.sku")}</th>
                  <th className="px-4 py-3 font-medium">{t("waitlistUi.product")}</th>
                  <th className="px-4 py-3 font-medium">{t("waitlistUi.email")}</th>
                  <th className="px-4 py-3 font-medium">{t("waitlistUi.requested")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">
                      {entry.productSlug ? (
                        <Link
                          href={`/${locale}/shop/${entry.productSlug}?sku=${encodeURIComponent(entry.sku)}`}
                          className="text-accent underline underline-offset-4"
                        >
                          {entry.sku}
                        </Link>
                      ) : (
                        entry.sku
                      )}
                    </td>
                    <td className="px-4 py-3">{entry.productName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${entry.email}`} className="underline underline-offset-4">
                        {entry.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      <span className="tabular-nums">
                        {entry.createdAt.toISOString().slice(0, 10)}
                      </span>
                      <Badge tone="muted" className="ml-2">
                        {entry.locale.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </AdminShell>
  )
}
