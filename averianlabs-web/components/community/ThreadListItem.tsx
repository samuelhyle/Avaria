import { Badge } from "@/components/ui/Badge"
import { tierFor } from "@/lib/community/reputation"
import { cn } from "@/lib/utils/cn"
import { Eye, MessagesSquare } from "lucide-react"
import Link from "next/link"

export interface ThreadRow {
  id: string
  slug: string
  title: string
  categorySlug: string
  replyCount: number
  viewCount: number
  lastActivityAt: Date | string
  authorName: string | null
  authorReputation: number
}

interface ThreadRowProps {
  thread: ThreadRow
  locale: string
  t: (key: string, values?: Record<string, string | number>) => string
}

export function ThreadListItem({ thread, locale, t }: ThreadRowProps) {
  const tier = tierFor(thread.authorReputation ?? 0)
  const authorLabel = thread.authorName ?? "Anonymous"
  const last = new Date(thread.lastActivityAt)
  const ago = relativeTime(last, locale)

  return (
    <Link
      href={`/${locale}/community/thread/${thread.slug}`}
      className={cn(
        "group flex items-center gap-4 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 transition-colors",
        "hover:border-accent/40 hover:bg-accent-soft/30",
      )}
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-ink group-hover:text-accent">
          {thread.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <MessagesSquare className="h-3 w-3" />
            {thread.replyCount}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {thread.viewCount}
          </span>
          <span>·</span>
          <span>
            {t("threadBy")} <span className="font-medium text-ink">{authorLabel}</span>
          </span>
          {authorLabel !== "Anonymous" ? (
            <Badge tone={tier.color} size="sm">
              {t(`reputation${capitalize(tier.id)}` as never)}
            </Badge>
          ) : null}
        </div>
      </div>
      <time dateTime={last.toISOString()} className="shrink-0 text-xs text-ink-subtle">
        {ago}
      </time>
    </Link>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function relativeTime(date: Date, locale: string): string {
  const now = Date.now()
  const diff = Math.max(0, now - date.getTime())
  const min = Math.round(diff / 60_000)
  if (min < 1) return "now"
  if (min < 60) return `${min}m`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d`
  try {
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}
