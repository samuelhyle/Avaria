"use client"

import { countUnreadNotifications } from "@/lib/notifications"
import { Bell } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useEffect, useState } from "react"

/**
 * The notification bell.
 *
 * The notifications service has claimed in its own comment that "the bell icon
 * in the header reads from this table" — there was no bell. The count is
 * fetched for the signed-in customer only, and the button links to the inbox.
 */
export function NotificationBell({ locale }: { locale: string }) {
  const t = useTranslations("notifications")
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/notifications", { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { unread?: number } | null) => {
        if (!cancelled && body && typeof body.unread === "number") setCount(body.unread)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Link
      href={`/${locale}/account/notifications`}
      aria-label={count ? t("unreadCount", { count }) : t("title")}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <Bell className="h-4 w-4" aria-hidden />
      {count && count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  )
}
