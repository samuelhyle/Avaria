"use client"

/**
 * GDPR opt-in banner shown above the chat drawer when consent is "unset".
 *
 * Lives outside the drawer so the user can accept/decline without first
 * opening the chat. Accept sets a 1-year cookie via /api/ai/consent and the
 * server picks it up on the very next request to persist conversation
 * turns.
 */

import { cn } from "@/lib/utils/cn"
import { ShieldCheck, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useTranslations } from "next-intl"

export interface ConsentBannerProps {
  consent: "accepted" | "declined" | "unset"
  onAccept: () => void
  onDecline: () => void
}

export function ConsentBanner({ consent, onAccept, onDecline }: ConsentBannerProps) {
  const t = useTranslations("averia.consent")

  const visible = consent === "unset"

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="averia-consent"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          // biome-ignore lint/a11y/useSemanticElements: animated banner cannot use <dialog>
          role="dialog"
          aria-label={t("title")}
          className={cn(
            // Bottom-left so it never collides with the right-corner stack
            // (chat launcher, back-to-top, compare bar).
            "fixed bottom-5 left-5 z-30 w-[min(360px,calc(100vw-2.5rem))]",
            "rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-xl",
            "md:bottom-6 md:left-6",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">{t("title")}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t("body")}</p>
              <ul className="mt-2 space-y-0.5 text-xs text-ink-muted">
                <li>· {t("benefit1")}</li>
                <li>· {t("benefit2")}</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onDecline}
              aria-label={t("dismiss")}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-subtle hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              {t("accept")}
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="flex-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-2"
            >
              {t("decline")}
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
