export const dynamic = "force-dynamic"

import { AdminShell, ForbiddenShell } from "@/components/admin/admin-shell"
import { StockAdjustment } from "@/components/admin/stock-adjustment"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getAdminOrNull } from "@/lib/admin"
import { listInventoryVials } from "@/lib/admin/orders"
import { formatCurrency } from "@/lib/utils/format"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Inventory · Admin", robots: { index: false, follow: false } }
}

export default async function AdminInventoryPage({
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
  const vials = await listInventoryVials(200)
  const lowCount = vials.filter((vial) => vial.low).length
  return (
    <AdminShell member={member}>
      <Container className="py-10">
        <header className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("inventory")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("inventoryUi.subtitle")}</p>
          {lowCount > 0 ? (
            <p className="mt-2 text-xs text-warn">
              {t("inventoryUi.lowCount", { count: lowCount })}
            </p>
          ) : null}
        </header>

        {vials.length === 0 ? (
          <p className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center text-sm text-ink-muted">
            {t("inventoryUi.empty")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-2xs uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("inventoryUi.sku")}</th>
                  <th className="px-4 py-3 font-medium">{t("inventoryUi.stock")}</th>
                  <th className="px-4 py-3 font-medium">{t("inventoryUi.mode")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("inventoryUi.price")}</th>
                  <th className="px-4 py-3 font-medium">{t("inventoryUi.adjust")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {vials.map((vial) => (
                  <tr key={vial.vialId} className="hover:bg-surface-2">
                    <td className="px-4 py-3 font-mono text-xs">{vial.sku}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={vial.stockQty <= 0 ? "danger" : vial.low ? "warn" : "muted"}
                        size="sm"
                      >
                        {vial.stockQty}
                      </Badge>
                      {vial.lowStockThreshold !== null ? (
                        <span className="ml-2 text-2xs text-ink-subtle">
                          ≤ {vial.lowStockThreshold}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{vial.purchaseMode}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {vial.priceCents && vial.priceCents > 0
                        ? formatCurrency(vial.priceCents, "EUR", locale)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StockAdjustment
                        vialId={vial.vialId}
                        sku={vial.sku}
                        stockQty={vial.stockQty}
                        lowStockThreshold={vial.lowStockThreshold}
                        labels={{
                          set: t("inventoryUi.set"),
                          threshold: t("inventoryUi.threshold"),
                          save: t("inventoryUi.save"),
                          saved: t("inventoryUi.saved"),
                          failed: t("inventoryUi.failed"),
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-2xs text-ink-subtle">
          <Link href={`/${locale}/admin/orders`} className="text-accent hover:underline">
            ← {t("ordersUi.back")}
          </Link>
        </p>
      </Container>
    </AdminShell>
  )
}
