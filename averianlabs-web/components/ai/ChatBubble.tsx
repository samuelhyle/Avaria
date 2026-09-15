"use client"

import { cn } from "@/lib/utils/cn"
import { MessageSquare } from "lucide-react"
import { motion } from "motion/react"
import { useTranslations } from "next-intl"

export interface ChatBubbleProps {
  unread: boolean
  onOpen: () => void
  className?: string
}

export function ChatBubble({ unread, onOpen, className }: ChatBubbleProps) {
  const t = useTranslations("averia")

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={t("open")}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 12 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={cn(
        "fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30",
        "transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "md:bottom-6 md:right-6",
        className,
      )}
    >
      <MessageSquare className="h-6 w-6" />
      {unread ? (
        <span className="absolute right-1.5 top-1.5 inline-flex h-3 w-3 rounded-full bg-danger ring-2 ring-bg" />
      ) : null}
    </motion.button>
  )
}
