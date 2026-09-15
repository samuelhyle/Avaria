"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useOverlay } from "@/lib/hooks/use-overlay"
import { Loader2, Mail, Sparkles, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

const STORAGE_KEY = "averianlabs-newsletter-dismissed"

export function NewsletterModal() {
  const t = useTranslations("newsletter")
  const tCommon = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const dismissed = sessionStorage.getItem(STORAGE_KEY)
    if (dismissed) return
    const timer = window.setTimeout(() => setOpen(true), 45_000)
    return () => window.clearTimeout(timer)
  }, [])

  const close = () => {
    setOpen(false)
    sessionStorage.setItem(STORAGE_KEY, "1")
  }

  const containerRef = useOverlay({ open, onClose: close, initialFocusRef: emailRef })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label={tCommon("close")}
        onClick={close}
        className="absolute inset-0 -z-10"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-modal-title"
        className="relative w-full max-w-md rounded-[var(--radius-xl)] border border-line bg-surface p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label={tCommon("close")}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Sparkles className="h-5 w-5" />
        </div>

        <h2 id="newsletter-modal-title" className="mt-4 font-display text-2xl font-semibold">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-ink-muted text-pretty">{t("body")}</p>

        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            const form = e.currentTarget
            const formData = new FormData(form)
            const email = formData.get("email") as string

            setLoading(true)
            try {
              const res = await fetch("/api/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              })

              if (!res.ok) throw new Error(t("error"))

              toast.success(t("success"))
              close()
            } catch {
              toast.error(t("error"))
            } finally {
              setLoading(false)
            }
          }}
        >
          <Input
            ref={emailRef}
            type="email"
            name="email"
            aria-label={tCommon("emailAddress")}
            autoComplete="email"
            placeholder="you@lab.eu"
            required
          />
          <Button type="submit" size="lg" fullWidth disabled={loading} aria-busy={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("subscribing")}
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" aria-hidden />
                {t("subscribe")}
              </>
            )}
          </Button>
          <p className="text-center text-3xs text-ink-subtle">
            {t("privacyPre")}{" "}
            <a href="/legal/privacy" className="underline">
              {t("privacyLink")}
            </a>
            {t("privacyPost")}
          </p>
        </form>
      </div>
    </div>
  )
}
