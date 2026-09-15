"use client"

import { MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"

interface AskAveriaButtonProps {
  productName: string
}

export function AskAveriaButton({ productName }: AskAveriaButtonProps) {
  const t = useTranslations("averia.askButton")
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("averianlabs:open-chat", {
            detail: {
              message: t("prompt", { product: productName }),
            },
          }),
        )
      }
      className="mt-4 flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-accent/20 bg-accent-soft/40 p-4 text-left transition-all hover:border-accent/40 hover:bg-accent-soft/60"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-glow">
        <MessageCircle className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="font-display text-sm font-semibold text-ink">{t("title")}</p>
        <p className="text-xs text-ink-muted">{t("body")}</p>
      </div>
    </button>
  )
}
