"use client"

import { Bitcoin, CreditCard, FileCheck, Lock, ShieldCheck } from "lucide-react"

const methods = [
  { label: "Visa", icon: CreditCard },
  { label: "Mastercard", icon: CreditCard },
  { label: "Amex", icon: CreditCard },
  { label: "Apple Pay", icon: CreditCard },
  { label: "PayPal", icon: CreditCard },
  { label: "SEPA", icon: FileCheck },
  { label: "BTC / ETH / USDC", icon: Bitcoin },
]

export function SecureCheckout() {
  return (
    <aside className="mt-6 space-y-4">
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-success" />
          <h3 className="font-display text-sm font-semibold">Secure checkout</h3>
        </div>
        <ul className="mt-3 space-y-2 text-xs text-ink-muted">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>256-bit TLS · Stripe Radar fraud screening on every payment</span>
          </li>
          <li className="flex items-start gap-2">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>PCI-DSS Level 1 — we never see or store your card number</span>
          </li>
          <li className="flex items-start gap-2">
            <FileCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>EU 14-day right of withdrawal on consumer orders</span>
          </li>
        </ul>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <h3 className="font-display text-sm font-semibold">We accept</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {methods.map((m) => (
            <span
              key={m.label}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-1 text-3xs font-medium text-ink-muted"
            >
              <m.icon className="h-3 w-3" />
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}
