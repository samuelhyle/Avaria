"use client"

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils/cn"
import { Check, Eye, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

export interface ModerationItem {
  id: string
  kind: "event" | "report"
  targetType: string
  targetId: string
  layer: string
  verdict: string
  ruleCodes: string[] | null
  note: string | null
  createdAt: Date | string
  body: string | null
  threadSlug: string | null
  authorName: string | null
}

interface QueueActionsProps {
  items: ModerationItem[]
}

export function ModerationQueue({ items }: QueueActionsProps) {
  const router = useRouter()
  const t = useTranslations("admin.moderationQueue")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [expanded, setExpanded] = useState<string | null>(null)

  const decide = (item: ModerationItem, action: "allow" | "keep" | "remove" | "dismiss") => {
    setBusyId(item.id)
    startTransition(async () => {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, kind: item.kind, action }),
      })
      setBusyId(null)
      if (!res.ok) {
        toast.error(t("verdictError"))
        return
      }
      toast.success(t("verdictRecorded"))
      router.refresh()
    })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center text-sm text-ink-muted">
        {t("queueEmpty")}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = expanded === item.id
        const ts = new Date(item.createdAt)
        const isReport = item.kind === "report"
        return (
          <div
            key={`${item.kind}-${item.id}`}
            className={cn(
              "rounded-[var(--radius-lg)] border bg-surface p-4",
              isReport ? "border-warn/40" : "border-line",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 font-mono text-3xs uppercase tracking-wide",
                      isReport ? "bg-danger/10 text-danger" : "bg-warn-soft text-warn",
                    )}
                  >
                    {item.layer}
                  </span>
                  <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-3xs uppercase tracking-wide text-ink">
                    {item.targetType}
                  </span>
                  {item.ruleCodes && item.ruleCodes.length > 0 ? (
                    <span className="font-mono text-3xs text-danger">
                      {item.ruleCodes.join(", ")}
                    </span>
                  ) : null}
                  <span>{ts.toLocaleString()}</span>
                </div>
                <p className="mt-1.5 text-sm text-ink">
                  {item.body ? (
                    truncate(item.body, 240)
                  ) : (
                    <span className="italic text-ink-muted">{t("postBodyUnavailable")}</span>
                  )}
                </p>
                {item.note ? <p className="mt-1 text-xs text-ink-muted">{item.note}</p> : null}
                {item.authorName ? (
                  <p className="mt-1 text-xs text-ink-muted">
                    {t("byAuthor", { name: item.authorName })}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                {item.body ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                    className="inline-flex h-8 items-center gap-1 rounded-[var(--radius)] border border-line bg-surface px-2 text-xs text-ink-muted hover:bg-surface-2"
                    title={t("viewFullPost")}
                  >
                    <Eye className="h-3 w-3" />
                    {isOpen ? t("hide") : t("view")}
                  </button>
                ) : null}
                {isReport ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => decide(item, "dismiss")}
                      disabled={busyId === item.id}
                      title={t("dismissTitle")}
                    >
                      <Check className="h-3.5 w-3.5 text-success" />
                      {t("dismiss")}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => decide(item, "remove")}
                      disabled={busyId === item.id}
                      title={t("removePostTitle")}
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("removePost")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => decide(item, "allow")}
                      disabled={busyId === item.id}
                      title={t("allowTitle")}
                    >
                      <Check className="h-3.5 w-3.5 text-success" />
                      {t("allow")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => decide(item, "keep")}
                      disabled={busyId === item.id}
                      title={t("keepTitle")}
                    >
                      {t("keep")}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => decide(item, "remove")}
                      disabled={busyId === item.id}
                      title={t("removeTitle")}
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("remove")}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {isOpen && item.body ? (
              <pre
                className={cn(
                  "mt-3 whitespace-pre-wrap rounded-[var(--radius)] border border-line bg-surface-2 p-3 text-xs text-ink",
                )}
              >
                {item.body}
              </pre>
            ) : null}
            {item.threadSlug ? (
              <a
                href={`/community/thread/${item.threadSlug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-accent hover:underline"
              >
                {t("openThread")}
              </a>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s
}
