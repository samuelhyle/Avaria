"use client"

import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Loader2, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

interface CreatePlanDialogProps {
  locale: string
}

export function CreatePlanDialog({ locale }: CreatePlanDialogProps) {
  const t = useTranslations("plans")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    if (!title.trim()) return
    startTransition(async () => {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, notes: notes || undefined }),
      })
      const data = (await res.json()) as { ok: boolean; planId?: string }
      if (data.ok && data.planId) {
        setOpen(false)
        setTitle("")
        setNotes("")
        router.push(`/${locale}/account/plans/${data.planId}`)
      }
    })
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("createNew")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>{t("createNew")}</DialogTitle>
          <div className="mt-4 space-y-3">
            <Input
              label={t("fieldTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
            <div>
              <label
                htmlFor="plan-notes"
                className="mb-1.5 block text-xs font-medium text-ink-muted"
              >
                {t("fieldNotes")}
              </label>
              <textarea
                id="plan-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder={t("notesPlaceholder")}
                className="w-full rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-sm leading-relaxed focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-xs text-ink-subtle">{t("fieldNotesHint")}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button size="sm" onClick={submit} disabled={isPending || !title.trim()}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {t("createNew")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
