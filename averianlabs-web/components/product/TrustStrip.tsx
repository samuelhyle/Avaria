"use client"

import { Award, CheckCircle2, FlaskConical, Lock, Shield, Truck } from "lucide-react"
import { useTranslations } from "next-intl"

export function TrustStrip() {
  const t = useTranslations("product")
  const badges = [
    { icon: Shield, label: t("trustBadge1") },
    { icon: FlaskConical, label: t("trustBadge2") },
    { icon: CheckCircle2, label: t("trustBadge3") },
    { icon: Truck, label: t("trustBadge4") },
    { icon: Award, label: t("trustBadge5") },
    { icon: Lock, label: t("trustBadge6") },
  ]

  return (
    <div className="mt-8 border-t border-line pt-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {badges.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <Icon className="h-3 w-3" />
            </span>
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
