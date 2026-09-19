import { AdminShell, ForbiddenShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getAdminOrNull } from "@/lib/admin"
import { listAuditEvents } from "@/lib/audit/log"
import { ScrollText, ShieldAlert } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Audit log · Admin", robots: { index: false, follow: false } }
}

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const member = await getAdminOrNull()
  if (!member) {
    return (
      <Container size="narrow" className="py-16">
        <ForbiddenShell>
          <Link
            href={`/${locale}/admin`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            ← Admin
          </Link>
        </ForbiddenShell>
      </Container>
    )
  }
  const t = await getTranslations("admin")
  const events = await listAuditEvents({ limit: 200 })

  return (
    <Container className="py-10">
      <AdminShell member={member}>
        <header className="mb-6">
          <Badge tone="warn" size="sm" className="mb-2">
            Admin · Audit log
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {t("audit")}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t("auditSub")}</p>
        </header>

        {events.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center text-sm text-ink-muted">
            <ScrollText className="mx-auto mb-3 h-6 w-6 text-ink-subtle" />
            No admin actions recorded yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {events.map((e) => (
                  <tr key={e.id} className="text-ink">
                    <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{e.actorEmail ?? e.actorId ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{e.action}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                      {e.entity}
                      {e.entityId ? (
                        <span className="ml-1 text-ink-subtle">#{e.entityId.slice(0, 8)}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                      {e.metadata ? JSON.stringify(e.metadata) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminShell>
    </Container>
  )
}
