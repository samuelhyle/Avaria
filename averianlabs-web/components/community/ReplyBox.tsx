"use client"

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils/cn"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

interface ReplyBoxProps {
  threadSlug: string
  isAuthed: boolean
  signInHref: string
  isLocked: boolean
}

export function ReplyBox({ threadSlug, isAuthed, signInHref, isLocked }: ReplyBoxProps) {
  const t = useTranslations("community")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (isLocked) {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-surface-2 px-4 py-3 text-sm text-ink-muted">
        {t("lockedNotice")}
      </div>
    )
  }

  if (!isAuthed) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-accent-soft px-4 py-3 text-sm">
        <span className="text-ink-muted">{t("signInToPost")}</span>
        <a
          href={signInHref}
          className="inline-flex h-8 items-center rounded-[var(--radius)] bg-accent px-3 text-xs font-medium text-white hover:bg-accent-hover"
        >
          {t("signInCta")}
        </a>
      </div>
    )
  }

  const submit = () => {
    if (!body.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await fetch("/api/forum/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadSlug, body }),
      })
      const data = (await res.json()) as { ok: boolean; reason?: string }
      if (!data.ok) {
        setError(data.reason ?? "Failed")
        return
      }
      setBody("")
      router.refresh()
    })
  }

  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-line bg-surface p-4">
      <label htmlFor="reply-body" className="block text-xs font-medium text-ink-muted">
        {t("replyTitle")}
      </label>
      <textarea
        id="reply-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={8000}
        placeholder={t("replyPlaceholder")}
        className={cn(
          "w-full rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-sm leading-relaxed placeholder:text-ink-subtle focus:border-accent focus:outline-none",
          error && "border-danger focus:border-danger",
        )}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={submit} disabled={isPending || !body.trim()}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {isPending ? "…" : t("replySubmit")}
        </Button>
      </div>
    </div>
  )
}
