import { Badge } from "@/components/ui/Badge"
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents"
import { Calendar, Download, FileWarning } from "lucide-react"
import Link from "next/link"

interface DocumentListItem {
  id: string
  type: string
  title: string
  version: string
  publishedAt: Date | string
  productSlug?: string | null
  productName?: string | null
}

interface DocumentListProps {
  docs: DocumentListItem[]
  locale: string
  emptyMessage?: string
}

export function DocumentList({ docs, locale, emptyMessage }: DocumentListProps) {
  if (docs.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-dashed border-line bg-surface p-6 text-center text-sm text-ink-muted">
        {emptyMessage ?? "No documents."}
      </p>
    )
  }
  return (
    <ul className="space-y-2">
      {docs.map((d) => (
        <li key={d.id}>
          <Link
            href={`/${locale}/documents/${d.id}`}
            className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 transition-colors hover:border-accent/40 hover:bg-accent-soft/30"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge tone="muted" size="sm">
                  {DOCUMENT_TYPE_LABELS[d.type as keyof typeof DOCUMENT_TYPE_LABELS] ?? d.type}
                </Badge>
                <p className="truncate text-sm font-medium text-ink">{d.title}</p>
              </div>
              <p className="mt-0.5 text-xs text-ink-subtle">
                <Calendar className="mr-1 inline h-3 w-3" />
                {new Date(d.publishedAt).toISOString().slice(0, 10)} · v{d.version}
                {d.productName ? <> · {d.productName}</> : null}
              </p>
            </div>
            <Download className="h-4 w-4 text-ink-subtle" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
