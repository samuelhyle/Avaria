"use client"

import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"
import { useState } from "react"

/**
 * The customer's referral code, and the field to redeem somebody else's.
 *
 * The discount is issued as a personal code when a referral is redeemed, so
 * the customer uses it at checkout exactly like any other promotion code.
 */
export function ReferralPanel({
  referralCode,
  pointsCents,
}: {
  referralCode: string | null
  pointsCents: number
}) {
  const t = useTranslations("account")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [issued, setIssued] = useState<string | null>(null)

  async function generate() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch("/api/referral/generate", { method: "POST" })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(t("referralFailed"))
        return
      }
      setIssued(data.code)
    } catch {
      setError(t("referralFailed"))
    } finally {
      setBusy(false)
    }
  }

  async function redeem() {
    if (!code.trim() || busy) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch("/api/referral/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: code.trim() }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.error ?? t("referralFailed"))
        return
      }
      setMessage(t("referralRedeemed", { code: data.code }))
      setCode("")
    } catch {
      setError(t("referralFailed"))
    } finally {
      setBusy(false)
    }
  }

  const shown = issued ?? referralCode
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-[var(--radius)] border border-line bg-surface-2 p-5">
        <h3 className="text-sm font-semibold">{t("referralYourCode")}</h3>
        {shown ? (
          <p className="mt-3 font-mono text-lg tracking-wide">{shown}</p>
        ) : (
          <Button size="sm" variant="outline" className="mt-3" disabled={busy} onClick={generate}>
            {t("referralGenerate")}
          </Button>
        )}
        <p className="mt-3 text-xs text-ink-muted">{t("referralCredit", { amount: "€15" })}</p>
        <p className="mt-1 text-xs text-ink-subtle">
          {t("referralBalance", { amount: `€${(pointsCents / 100).toFixed(2)}` })}
        </p>
      </div>

      <div className="rounded-[var(--radius)] border border-line bg-surface-2 p-5">
        <h3 className="text-sm font-semibold">{t("referralRedeem")}</h3>
        <p className="mt-2 text-xs text-ink-muted">{t("referralRedeemHint")}</p>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void redeem()
          }}
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder={t("referralPlaceholder")}
            aria-label={t("referralRedeem")}
            className="h-9 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-line bg-surface px-2 font-mono text-sm uppercase outline-none focus-visible:border-accent"
          />
          <Button size="sm" type="submit" disabled={busy || !code.trim()}>
            {t("referralApply")}
          </Button>
        </form>
        {message ? (
          <p role="status" className="mt-3 text-xs text-success">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
