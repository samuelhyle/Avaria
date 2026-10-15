"use client"

import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog"
import { Copy, Globe2, Loader2, Lock, Share2, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

interface PlanDetailActionsProps {
  planId: string
  shareSlug: string | null
  isPublic: boolean
  locale: string
  initialShareOpen?: boolean
}

export function PlanDetailActions({
  planId,
  shareSlug,
  isPublic,
  locale,
  initialShareOpen = false,
}: PlanDetailActionsProps) {
  const r = useTranslations("research")
  const t = useTranslations("plans")
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [, startTransition] = useTransition()
  const [shareOpen, setShareOpen] = useState(initialShareOpen && isPublic && Boolean(shareSlug))
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmPhrase, setConfirmPhrase] = useState("")

  const shareUrl = shareSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/plans/${shareSlug}`
    : ""

  const togglePublic = async () => {
    setBusy("share")
    setError("")
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      })
      const data = (await res.json()) as {
        ok: boolean
        plan?: { isPublic: boolean; shareSlug: string | null }
      }
      if (
        !res.ok ||
        !data.ok ||
        data.plan?.isPublic !== !isPublic ||
        (data.plan.isPublic ? !data.plan.shareSlug : data.plan.shareSlug !== null)
      )
        throw new Error("save failed")

      // Commit the badge, actions and share URL together from the confirmed server state.
      const destination = new URL(window.location.href)
      if (data.plan.isPublic) destination.searchParams.set("share", "1")
      else destination.searchParams.delete("share")
      window.location.assign(`${destination.pathname}${destination.search}${destination.hash}`)
    } catch {
      setError(t("saveFailed"))
      setBusy(null)
    }
  }

  const copy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setBusy("copy")
      setTimeout(() => setBusy(null), 1200)
    } catch {
      setError(t("copyFailed"))
    }
  }

  const destroy = () => {
    if (confirmPhrase !== "DELETE") return
    setBusy("delete")
    setError("")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" })
        const data = (await res.json()) as { ok: boolean }
        if (!res.ok || !data.ok) throw new Error("delete failed")
        router.push(`/${locale}/account/plans`)
      } catch {
        setError(t("saveFailed"))
      } finally {
        setBusy(null)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error ? (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button variant="ghost" size="sm" onClick={togglePublic} disabled={busy !== null}>
        {isPublic ? <Lock className="h-3.5 w-3.5" /> : <Globe2 className="h-3.5 w-3.5" />}
        {isPublic ? t("makePrivate") : t("makePublic")}
      </Button>
      {shareSlug ? (
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="h-3.5 w-3.5" />
          {t("shareTitle")}
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
        <Trash2 className="h-3.5 w-3.5 text-danger" />
        {t("deletePlan")}
      </Button>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>{t("shareTitle")}</DialogTitle>
          <p className="mt-1 text-sm text-ink-muted">
            {isPublic ? t("shareDescription") : t("privateShare")}
          </p>
          {shareUrl ? (
            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly
                aria-label={t("shareTitle")}
                value={shareUrl}
                className="h-10 flex-1 rounded-[var(--radius)] border border-line bg-surface-2 px-3 font-mono text-xs text-ink"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="h-3.5 w-3.5" />
                {busy === "copy" ? t("shareCopied") : t("copyLink")}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-danger">{t("deletePlan")}</DialogTitle>
          <p className="mt-1 text-sm text-ink-muted">{t("deleteConfirm")}</p>
          <input
            type="text"
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder={t("deleteConfirmPhrase")}
            aria-label={t("deleteConfirmPhrase")}
            className="mt-3 h-10 w-full rounded-[var(--radius)] border border-line bg-surface px-3 font-mono text-sm text-ink focus:border-danger focus:outline-none"
          />
          {error ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>
              {r("cancel")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={destroy}
              disabled={confirmPhrase !== "DELETE" || busy === "delete"}
            >
              {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t("deletePlan")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
