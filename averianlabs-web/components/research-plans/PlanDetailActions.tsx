"use client"

import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog"
import { Copy, Globe2, Loader2, Lock, Share2, Trash2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

interface PlanDetailActionsProps {
  planId: string
  shareSlug: string | null
  isPublic: boolean
  locale: string
}

export function PlanDetailActions({ planId, shareSlug, isPublic, locale }: PlanDetailActionsProps) {
  const t = useTranslations("plans")
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [shareOpen, setShareOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmPhrase, setConfirmPhrase] = useState("")

  const shareUrl = shareSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/plans/${shareSlug}`
    : ""

  const togglePublic = () => {
    setBusy("share")
    startTransition(async () => {
      await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      })
      setBusy(null)
      setShareOpen(true)
      router.refresh()
    })
  }

  const copy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setBusy("copy")
      setTimeout(() => setBusy(null), 1200)
    } catch {
      // ignore
    }
  }

  const destroy = () => {
    if (confirmPhrase !== "DELETE") return
    setBusy("delete")
    startTransition(async () => {
      await fetch(`/api/plans/${planId}`, { method: "DELETE" })
      setBusy(null)
      router.push(`/${locale}/account/plans`)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
          <p className="mt-1 text-sm text-ink-muted">{t("shareDescription")}</p>
          {shareUrl ? (
            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="h-10 flex-1 rounded-[var(--radius)] border border-line bg-surface-2 px-3 font-mono text-xs text-ink"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="h-3.5 w-3.5" />
                {busy === "copy" ? t("shareCopied") : t("copy")}
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
            className="mt-3 h-10 w-full rounded-[var(--radius)] border border-line bg-surface px-3 font-mono text-sm text-ink focus:border-danger focus:outline-none"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
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
