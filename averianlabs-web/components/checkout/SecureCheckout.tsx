"use client"

import { Bitcoin, CreditCard, FileCheck, Lock, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"

export function SecureCheckout() {
  const t = useTranslations("checkout")
  const methods = [
    { key: "paymentVisa", icon: CreditCard },
    { key: "paymentMastercard", icon: CreditCard },
    { key: "paymentAmex", icon: CreditCard },
    { key: "paymentApplePay", icon: CreditCard },
    { key: "paymentPaypal", icon: CreditCard },
    { key: "paymentSepa", icon: FileCheck },
    { key: "paymentCrypto", icon: Bitcoin },
  ] as const

  return (
    <aside className="mt-6 space-y-4">
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-success" />
          <h3 className="font-display text-sm font-semibold">{t("secureHeading")}</h3>
        </div>
        <ul className="mt-3 space-y-2 text-xs text-ink-muted">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>{t("secureTls")}</span>
          </li>
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>{t("securePci")}</span>
          </li>
          <li className="flex items-start gap-2">
            <FileCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>{t("secureWithdrawal")}</span>
          </li>
        </ul>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <h3 className="font-display text-sm font-semibold">{t("weAccept")}</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {methods.map((m) => (
            <span
              key={m.key}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-1 text-3xs font-medium text-ink-muted"
            >
              <m.icon className="h-3 w-3" />
              {t(m.key)}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}
