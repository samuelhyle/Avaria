"use client"

import type { ReactionKind } from "@/lib/community"
import { cn } from "@/lib/utils/cn"
import { Heart, Lightbulb, ThumbsUp } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

interface ReactionBarProps {
  postId: string
  isAuthed: boolean
  counts: { helpful: number; insightful: number; thanks: number }
  mine: { helpful: boolean; insightful: boolean; thanks: boolean }
  isOwnPost: boolean
}

const KINDS: { kind: ReactionKind; icon: typeof ThumbsUp; tone: string }[] = [
  { kind: "helpful", icon: ThumbsUp, tone: "text-accent" },
  { kind: "insightful", icon: Lightbulb, tone: "text-ice" },
  { kind: "thanks", icon: Heart, tone: "text-success" },
]

export function ReactionBar({ postId, isAuthed, counts, mine, isOwnPost }: ReactionBarProps) {
  const t = useTranslations("community")
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState<ReactionKind | null>(null)
  const [failed, setFailed] = useState(false)

  const onClick = (kind: ReactionKind) => {
    if (!isAuthed || isOwnPost || busy) return
    setBusy(kind)
    setFailed(false)
    startTransition(async () => {
      try {
        const res = await fetch("/api/forum/reactions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ postId, kind }),
        })
        if (!res.ok) {
          setFailed(true)
          return
        }
        router.refresh()
      } catch {
        setFailed(true)
      } finally {
        // Without this the buttons stay disabled for the rest of the session
        // when the request throws.
        setBusy(null)
      }
    })
  }

  return (
    <div className="flex items-center gap-1">
      {KINDS.map(({ kind, icon: Icon, tone }) => {
        const active = mine[kind]
        const count = counts[kind]
        return (
          <button
            key={kind}
            type="button"
            onClick={() => onClick(kind)}
            disabled={!isAuthed || isOwnPost}
            title={
              isOwnPost
                ? t("reactOwnPost")
                : !isAuthed
                  ? t("reactSignIn")
                  : t(`reaction${capitalize(kind)}` as never)
            }
            className={cn(
              "inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
              active
                ? "border-accent/40 bg-accent-soft text-accent"
                : "border-line bg-surface text-ink-muted hover:border-accent/30 hover:text-ink",
              (isOwnPost || !isAuthed) && "cursor-not-allowed opacity-60",
            )}
          >
            <Icon className={cn("h-3 w-3", active && tone)} aria-hidden="true" />
            <span>{count}</span>
            <span className="sr-only">{t(`reaction${capitalize(kind)}` as never)}</span>
          </button>
        )
      })}
      {failed ? (
        <span role="alert" className="text-2xs text-danger">
          {t("reactFailed")}
        </span>
      ) : null}
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
