"use client"

import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog"
import { AlertTriangle, Download, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

export function GdprPanel() {
  const t = useTranslations("gdpr")
  const [exportPending, setExportPending] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [phrase, setPhrase] = useState("")
  const [deleted, setDeleted] = useState(false)
  const [isPending, startTransition] = useTransition()

  const exportData = () => {
    setExportPending(true)
    startTransition(async () => {
      const res = await fetch("/api/account/export", { method: "POST" })
      if (!res.ok) {
        setExportPending(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "averianlabs-data.json"
      a.click()
      URL.revokeObjectURL(url)
      setExportPending(false)
    })
  }

  const confirmDelete = () => {
    if (phrase !== "DELETE") return
    startTransition(async () => {
      const res = await fetch("/api/account/delete", { method: "DELETE" })
      if (res.ok) {
        setDeleted(true)
        setDeleteOpen(false)
      }
    })
  }

  if (deleted) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-warn/30 bg-warn-soft p-5 text-sm text-warn">
        <p className="font-medium">Account deletion scheduled.</p>
        <p className="mt-1 text-xs">All your data will be permanently deleted in 30 days.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold text-ink">{t("exportTitle")}</h3>
        <p className="mt-1 text-sm text-ink-muted">{t("exportDescription")}</p>
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            disabled={exportPending || isPending}
          >
            {exportPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {t("exportButton")}
          </Button>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-danger/30 bg-danger-soft p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-danger">
          <AlertTriangle className="h-4 w-4" />
          {t("deleteTitle")}
        </h3>
        <p className="mt-1 text-sm text-ink-muted">{t("deleteDescription")}</p>
        <div className="mt-3">
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            {t("deleteButton")}
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-danger">{t("deleteTitle")}</DialogTitle>
          <p className="mt-1 text-sm text-ink-muted">{t("deleteConfirm")}</p>
          <input
            type="text"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value.toUpperCase())}
            placeholder="DELETE"
            className="mt-3 h-10 w-full rounded-[var(--radius)] border border-line bg-surface px-3 font-mono text-sm text-ink focus:border-danger focus:outline-none"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={confirmDelete}
              disabled={phrase !== "DELETE"}
            >
              {t("deleteButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
