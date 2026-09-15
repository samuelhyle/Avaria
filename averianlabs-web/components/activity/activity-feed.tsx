import { recentActivity } from "@/lib/activity/emit"
import { Activity } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

const KIND_ICON: Record<string, string> = {
  thread_created: "💬",
  post_created: "↩",
  reaction_added: "♥",
  batch_status_changed: "🧪",
  product_status_published: "✨",
  research_note_published: "📝",
  plan_shared: "📋",
}

const KIND_ROUTE: Record<
  string,
  (e: { targetType: string | null; targetSlug: string | null }) => string | null
> = {
  thread_created: (e) => (e.targetSlug ? `/community/thread/${e.targetSlug}` : null),
  post_created: (e) => (e.targetSlug ? `/community/thread/${e.targetSlug}` : null),
  plan_shared: (e) => (e.targetSlug ? `/plans/${e.targetSlug}` : null),
  research_note_published: () => "/blog",
  product_status_published: (e) => (e.targetSlug ? `/shop/${e.targetSlug}` : null),
  batch_status_changed: (e) => (e.targetSlug ? `/coa/${e.targetSlug}` : null),
}

export async function ActivityFeed({ locale }: { locale: string }) {
  const t = await getTranslations("activity")
  const events = await recentActivity(8).catch(() => [])

  if (events.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-8 text-center text-sm text-ink-muted">
        <Activity className="mx-auto mb-2 h-5 w-5 text-ink-subtle" />
        {t("empty")}
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-ink">{t("title")}</h3>
        </div>
        <Link
          href={`/${locale}/community/activity`}
          className="text-xs text-accent hover:underline"
        >
          {t("viewAll")} →
        </Link>
      </div>
      <ul className="divide-y divide-line">
        {events.map((e) => {
          const route = KIND_ROUTE[e.kind]?.(e) ?? null
          const icon = KIND_ICON[e.kind] ?? "•"
          const ts = new Date(e.createdAt)
          const verb = t(`kind.${e.kind}` as never)
          const content = (
            <span className="flex items-start gap-3 px-4 py-2.5">
              <span aria-hidden="true" className="mt-0.5 text-base leading-none">
                {icon}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-ink">{e.actorName ?? "Someone"}</span>{" "}
                <span className="text-ink-muted">{verb}</span>{" "}
                {e.targetTitle ? (
                  <span className="font-medium text-ink">"{truncate(e.targetTitle, 60)}"</span>
                ) : null}
                <span className="ml-2 text-xs text-ink-subtle">{relative(ts)}</span>
              </span>
            </span>
          )
          return (
            <li key={e.id}>
              {route ? (
                <Link
                  href={`/${locale}${route}`}
                  className="block transition-colors hover:bg-accent-soft/30"
                >
                  {content}
                </Link>
              ) : (
                <div>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function relative(d: Date): string {
  const diff = Math.max(0, Date.now() - d.getTime())
  const min = Math.round(diff / 60_000)
  if (min < 1) return "now"
  if (min < 60) return `${min}m`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}
