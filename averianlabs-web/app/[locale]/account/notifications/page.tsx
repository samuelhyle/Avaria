export const dynamic = "force-dynamic"

import { NotificationPreferences } from "@/components/account/NotificationPreferences"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getCurrentMember } from "@/lib/community"
import { getOrCreatePreferences, listUnreadNotifications } from "@/lib/notifications"
import { Bell, BellOff } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const r = await getTranslations({ locale, namespace: "research" })
  const member = await getCurrentMember()
  if (!member) {
    return (
      <Container size="narrow" className="py-16">
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center">
          <BellOff className="mx-auto mb-3 h-6 w-6 text-ink-subtle" />
          <p className="text-sm text-ink-muted">{r("signInRequired")}</p>
          <Link
            href={`/${locale}/account`}
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            {r("signIn")}
          </Link>
        </div>
      </Container>
    )
  }
  const [notifications, prefs] = await Promise.all([
    listUnreadNotifications(member.id, 50),
    getOrCreatePreferences(member.id),
  ])

  return (
    <Container className="py-10">
      <header className="mb-6">
        <Badge tone="muted" size="sm" className="mb-2">
          <Bell className="h-3 w-3" />
          {r("notificationsTitle")}
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">{r("inbox")}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {r("notificationCount", { count: notifications.length })}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          {notifications.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center text-sm text-ink-muted">
              {r("notificationsEmpty")}
            </div>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="rounded-[var(--radius)] border border-line bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        <span className="font-medium">{n.actorName ?? r("someone")}</span>{" "}
                        {n.kind === "reply"
                          ? r("notificationReply")
                          : n.kind === "reaction"
                            ? r("notificationReaction")
                            : n.kind === "plan_shared"
                              ? r("notificationPlan")
                              : n.kind === "moderation_approved"
                                ? r("notificationModerationApproved")
                                : n.kind === "moderation_removed"
                                  ? r("notificationModerationRemoved")
                                  : r("notificationOther")}
                        {n.targetTitle ? (
                          <>
                            {" "}
                            <Link
                              href={
                                n.targetType === "thread" && n.targetSlug
                                  ? `/${locale}/community/thread/${n.targetSlug}`
                                  : n.targetType === "plan" && n.targetSlug
                                    ? `/${locale}/plans/${n.targetSlug}`
                                    : "#"
                              }
                              className="font-medium text-accent hover:underline"
                            >
                              {n.targetTitle}
                            </Link>
                          </>
                        ) : null}
                      </p>
                      {n.preview ? (
                        <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{n.preview}</p>
                      ) : null}
                    </div>
                    <time className="shrink-xs-0 text-xs text-ink-subtle">
                      {new Date(n.createdAt).toLocaleDateString(locale)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside>
          <NotificationPreferences
            userId={member.id}
            initial={{
              replyEnabled: prefs.replyEnabled,
              reactionEnabled: prefs.reactionEnabled,
              mentionEnabled: prefs.mentionEnabled,
              planSharedEnabled: prefs.planSharedEnabled,
              emailDigest: prefs.emailDigest,
            }}
          />
        </aside>
      </div>
    </Container>
  )
}
