"use client"

import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"
import { toast } from "sonner"

interface ReportDialogProps {
  postId: string
  isAuthed: boolean
}

export function ReportDialog({ postId, isAuthed }: ReportDialogProps) {
  const t = useTranslations("community")
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [detail, setDetail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!isAuthed) return null

  const submit = () => {
    if (reason.length < 3) return
    startTransition(async () => {
      try {
        const res = await fetch("/api/forum/reports", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ postId, reason, detail: detail || undefined }),
        })
        if (!res.ok) {
          toast.error(t("reportFailed"))
          return
        }
        setSubmitted(true)
        setTimeout(() => {
          setOpen(false)
          setSubmitted(false)
          setReason("")
          setDetail("")
        }, 1500)
      } catch {
        toast.error(t("reportFailed"))
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ink-subtle hover:text-danger"
      >
        {t("reportPost")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>{t("reportTitle")}</DialogTitle>
          <div className="space-y-4">
            {submitted ? (
              <p className="rounded-[var(--radius)] border border-success/30 bg-success-soft p-3 text-sm text-success">
                {t("reportSubmitted")}
              </p>
            ) : (
              <>
                <Input
                  label={t("reportReasonLabel")}
                  hint={t("reportReasonHint")}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                />
                <Textarea
                  label={t("reportDetailLabel")}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button size="sm" onClick={submit} disabled={isPending || reason.length < 3}>
                    {t("reportSubmit")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
