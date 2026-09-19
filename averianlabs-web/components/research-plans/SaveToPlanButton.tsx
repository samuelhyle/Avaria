"use client"

import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { BookmarkPlus, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

interface SaveToPlanButtonProps {
  productId: string
  productName: string
  plans: { id: string; title: string }[]
  isAuthed: boolean
  signInHref: string
}

export function SaveToPlanButton({
  productId,
  productName,
  plans,
  isAuthed,
  signInHref,
}: SaveToPlanButtonProps) {
  const t = useTranslations("plans")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newTitle, setNewTitle] = useState("")
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null)

  if (!isAuthed) {
    return (
      <a
        href={signInHref}
        className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent"
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        {t("signInCta")}
      </a>
    )
  }

  const add = (planId: string) => {
    setBusyPlanId(planId)
    startTransition(async () => {
      const res = await fetch(`/api/plans/${planId}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      })
      if (!res.ok) {
        setBusyPlanId(null)
        toast.error(t("saveFailed"))
        return
      }
      setBusyPlanId(null)
      setOpen(false)
      toast.success(t("addedToPlan"))
      router.refresh()
    })
  }

  const create = () => {
    if (!newTitle.trim()) return
    startTransition(async () => {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      })
      const data = (await res.json()) as { ok: boolean; planId?: string }
      if (data.ok && data.planId) {
        const itemRes = await fetch(`/api/plans/${data.planId}/items`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId }),
        }).catch(() => null)
        if (!itemRes?.ok) {
          toast.error(t("saveFailed"))
          return
        }
        setNewTitle("")
        setOpen(false)
        toast.success(t("addedToPlan"))
        router.refresh()
      } else {
        toast.error(t("saveFailed"))
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line bg-surface px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-accent/40 hover:bg-accent-soft/40 hover:text-accent"
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        {t("addProduct")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>{t("addProduct")}</DialogTitle>
          <p className="mt-1 text-sm text-ink-muted">{productName}</p>
          <div className="mt-4 space-y-3">
            {plans.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-ink-subtle">{t("selectPlanPrompt")}</p>
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => add(p.id)}
                    disabled={isPending}
                    className="flex w-full items-center justify-between rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-left text-sm hover:border-accent/40 hover:bg-accent-soft/40"
                  >
                    <span>{p.title}</span>
                    {busyPlanId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="border-t border-line pt-3">
              <Input
                label={t("fieldTitle")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={create} disabled={isPending || !newTitle.trim()}>
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {t("createAndAdd")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
