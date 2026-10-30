"use client"

import { Button } from "@/components/ui/Button"
import { useCheckout } from "@/lib/checkout/store"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"
import { AlertCircle, Loader2, Send } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

interface ChainOption {
  id: string
  label: string
  symbol: string
}

/**
 * "Pay with cryptocurrency" — hands the order to the Telegram bot.
 *
 * The site creates the order and the invoice on the server and then redirects
 * to a `t.me` deep link. The customer sees the amount, the address and the
 * deadline in Telegram, and the same amount the server will accept — the
 * browser never computes a crypto amount.
 */
export function CryptoPaymentOption({
  locale,
  payload,
  totalCents,
  chains,
  disabled,
}: {
  locale: string
  /** The checkout payload, reused verbatim by the crypto route. */
  payload: Record<string, unknown>
  totalCents: number
  /** The chains the store accepts, resolved by the parent. */
  chains: ChainOption[]
  disabled?: boolean
}) {
  const t = useTranslations("checkout")
  const setPendingOrder = useCheckout((state) => state.setPendingOrder)
  const [selected, setSelected] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelected((current) => current || chains[0]?.id || "")
  }, [chains])

  async function start() {
    if (!selected || busy) return
    const fingerprint = JSON.stringify({ ...payload, chain: selected })
    const saved = useCheckout.getState()
    const requestKey =
      saved.attemptFingerprint === fingerprint && saved.attemptKey
        ? saved.attemptKey
        : crypto.randomUUID()
    saved.setAttempt(fingerprint, requestKey)
    const telegramWindow = window.open("about:blank", "_blank")
    if (telegramWindow) telegramWindow.opener = null
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/checkout/crypto-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requestKey, chain: selected }),
      })
      const data = await response.json()
      if (!response.ok) {
        telegramWindow?.close()
        if (["attempt_expired", "quote_changed"].includes(data.code))
          useCheckout.getState().clearAttempt()
        setError(t("cryptoFailed"))
        return
      }
      // Register the order so the confirmation page can poll it and so the
      // cart is emptied once the payment lands. Without this the customer is
      // left with the items still in their cart after paying.
      setPendingOrder(data.orderId, data.confirmationUrl)
      if (telegramWindow) telegramWindow.location.href = data.telegramUrl
      window.location.assign(data.confirmationUrl)
    } catch {
      telegramWindow?.close()
      setError(t("cryptoFailed"))
    } finally {
      setBusy(false)
    }
  }

  if (chains.length === 0)
    return (
      <p className="rounded-[var(--radius-lg)] border border-line bg-surface-2/40 p-4 text-sm text-ink-muted">
        {t("cryptoUnavailable")}
      </p>
    )

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <h3 className="text-sm font-semibold">{t("cryptoTitle")}</h3>
      <p className="mt-2 text-sm text-ink-muted">{t("cryptoBody")}</p>

      <fieldset className="mt-4">
        <legend className="sr-only">{t("cryptoChain")}</legend>
        <div className="space-y-2">
          {chains.map((chain) => (
            <label
              key={chain.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border p-3 text-sm",
                selected === chain.id ? "border-accent bg-accent-soft" : "border-line",
              )}
            >
              <input
                type="radio"
                name="crypto-chain"
                value={chain.id}
                checked={selected === chain.id}
                onChange={() => setSelected(chain.id)}
              />
              <span className="flex-1">{chain.label}</span>
              <span className="font-mono text-xs text-ink-muted">{chain.symbol}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-danger">
          <AlertCircle className="h-4 w-4" aria-hidden />
          {error}
        </p>
      ) : null}

      <Button fullWidth className="mt-4" disabled={disabled || busy || !selected} onClick={start}>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Send className="h-4 w-4" aria-hidden />
        )}
        {t("cryptoContinue")}
      </Button>
      <p className="mt-2 text-2xs text-ink-subtle">
        {t("cryptoTotal", { amount: formatCurrency(totalCents, "EUR", locale) })}
      </p>
    </div>
  )
}
