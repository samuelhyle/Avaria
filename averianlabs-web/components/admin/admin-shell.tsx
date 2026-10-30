"use client"

import { Badge } from "@/components/ui/Badge"
import type { AdminMember } from "@/lib/admin"
import { cn } from "@/lib/utils/cn"
import {
  Activity,
  Boxes,
  ChevronRight,
  FileText,
  LogOut,
  Package,
  ScrollText,
  ShieldAlert,
  Users,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface AdminShellProps {
  member: AdminMember
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: typeof ScrollText
  description?: string
}

export function AdminShell({ member, children }: AdminShellProps) {
  const pathname = usePathname()
  const t = useTranslations("admin")

  // The admin routes live under a locale prefix. The links below used to point
  // at the bare `/admin` paths, so every click went through the middleware
  // redirect, and the client-side RSC prefetch for the link was upgraded to
  // HTTPS by the CSP — which a plain-HTTP local server cannot answer.
  const locale = pathname.split("/").filter(Boolean)[0] ?? "en"
  const adminPath = (path: string) => `/${locale}${path}`

  const navItems: NavItem[] = [
    {
      href: adminPath("/admin"),
      label: t("dashboard"),
      icon: Activity,
      description: t("dashboardSub"),
    },
    {
      href: adminPath("/admin/moderation"),
      label: t("moderation"),
      icon: ShieldAlert,
      description: t("moderationSub"),
    },
    {
      href: adminPath("/admin/orders"),
      label: t("orders"),
      icon: Package,
      description: t("ordersSub"),
    },
    {
      href: adminPath("/admin/inventory"),
      label: t("inventory"),
      icon: Boxes,
      description: t("inventorySub"),
    },
    {
      href: adminPath("/admin/documents"),
      label: t("documents"),
      icon: FileText,
      description: t("documentsSub"),
    },
    {
      href: adminPath("/admin/audit"),
      label: t("audit"),
      icon: ScrollText,
      description: t("auditSub"),
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
          <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
              {(member.name ?? member.email)[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{member.name ?? member.email}</p>
              <Badge tone={member.role === "admin" ? "warn" : "muted"} size="sm">
                {member.role}
              </Badge>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-start gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent-soft text-accent"
                      : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.label}</p>
                    {item.description ? (
                      <p className="mt-0.5 text-xs text-ink-subtle">{item.description}</p>
                    ) : null}
                  </div>
                  <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-ink-subtle" />
                </Link>
              )
            })}
          </nav>

          <div className="mt-4 border-t border-line pt-4">
            <button
              type="button"
              onClick={() =>
                signOut({ redirect: false }).then(() => window.location.assign(`/${locale}`))
              }
              className="flex w-full items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-xs text-ink-muted hover:bg-danger-soft hover:text-danger"
            >
              <LogOut className="h-3 w-3" aria-hidden />
              {t("signOut")}
            </button>
          </div>
        </div>
      </aside>

      {/*
        The page layout already renders the single `<main>` landmark, so this
        must not be another one: nested `<main>` elements are invalid HTML and
        give assistive technology two competing content landmarks.
      */}
      <div>{children}</div>
    </div>
  )
}

interface ForbiddenShellProps {
  children?: React.ReactNode
}

export function ForbiddenShell({ children }: ForbiddenShellProps) {
  const t = useTranslations("admin.documentsUi")
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center">
      <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-warn" aria-hidden />
      <h1 className="text-xl font-semibold text-ink">{t("forbiddenTitle")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("forbiddenBody")}</p>
      {children}
    </div>
  )
}
