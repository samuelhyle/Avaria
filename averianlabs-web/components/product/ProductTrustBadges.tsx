"use client"

import { Award, BadgeCheck, Lock, ShieldCheck, Truck } from "lucide-react"
import { useTranslations } from "next-intl"

export function ProductTrustBadges() {
  const t = useTranslations("product")
  const items = [
    { icon: ShieldCheck, label: t("trustBadge1"), sub: t("trustSub1") },
    { icon: BadgeCheck, label: t("trustBadge2"), sub: t("trustSub2") },
    { icon: Award, label: t("trustBadge3"), sub: t("trustSub3") },
    { icon: Truck, label: t("trustBadge4"), sub: t("trustSub4") },
  ]

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ icon: Icon, label, sub }) => (
        <li
          key={label}
          className="flex items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 py-2"
        >
          <Icon className="h-4 w-4 shrink-0 text-accent" />
          <div className="leading-tight">
            <p className="text-xs font-semibold text-ink">{label}</p>
            <p className="text-3xs text-ink-muted">{sub}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
