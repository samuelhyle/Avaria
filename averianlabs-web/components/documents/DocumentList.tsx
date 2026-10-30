import { Badge } from "@/components/ui/Badge"
import { formatDate } from "@/lib/utils/format"
import { ArrowUpRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

interface DocumentListItem {
  id: string
  type: string
  title: string
  version: string
  publishedAt: Date | string
  productSlug?: string | null
  productName?: string | null
  productId?: string | null
  batchId?: string | null
  batchCode?: string | null
  batchSku?: string | null
}

interface DocumentListProps {
  docs: DocumentListItem[]
  locale: string
  emptyMessage?: string
}

export async function DocumentList({ docs, locale, emptyMessage }: DocumentListProps) {
  const t = await getTranslations({ locale, namespace: "research" })
  const l = await getTranslations({ locale, namespace: "documentLibrary" })
  if (docs.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-dashed border-line bg-surface p-6 text-center text-sm text-ink-muted">
        {emptyMessage ?? t("noDocuments")}
      </p>
    )
  }
  return (
    <ul className="space-y-2">
      {docs.map((d) => (
        <li key={d.id}>
          <Link
            href={`/${locale}/documents/${d.id}`}
            className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent/40 hover:bg-accent-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="muted" size="sm">
                  {t(`docLabels.${d.type}`)}
                </Badge>
                <p className="break-words text-base font-semibold text-ink">{d.title}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {formatDate(d.publishedAt, locale)} · {t("version")} {d.version}
                {d.productName ? <> · {d.productName}</> : null}
              </p>
              {d.batchId !== undefined && (
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {d.batchId ? (
                    <>
                      {l("batchScope")} ·{" "}
                      <span className="font-mono">
                        {d.batchSku} {d.batchCode}
                      </span>
                    </>
                  ) : (
                    l(d.productId ? "productScope" : "generalScope")
                  )}
                </p>
              )}
            </div>
            <ArrowUpRight aria-hidden className="mt-1 h-4 w-4 shrink-0 text-accent" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
