"use client"

import { ThumbsDown, ThumbsUp } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils/cn"

export function FeedbackBar({
  feedback,
  onFeedback,
}: {
  feedback?: "up" | "down"
  onFeedback: (feedback: "up" | "down") => void
}) {
  const t = useTranslations("averia")
  return (
    <div className="flex items-center gap-1 px-1">
      <button
        type="button"
        onClick={() => onFeedback("up")}
        aria-label={t("feedback.helpful")}
        aria-pressed={feedback === "up"}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors",
          feedback === "up"
            ? "bg-success/20 text-success"
            : "text-ink-subtle hover:bg-surface-2 hover:text-ink",
        )}
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onFeedback("down")}
        aria-label={t("feedback.notHelpful")}
        aria-pressed={feedback === "down"}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors",
          feedback === "down"
            ? "bg-danger/20 text-danger"
            : "text-ink-subtle hover:bg-surface-2 hover:text-ink",
        )}
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
    </div>
  )
}
