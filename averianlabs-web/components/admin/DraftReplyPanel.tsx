"use client"

import { cn } from "@/lib/utils/cn"
import { Check, Clipboard, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

export interface DraftReplyPanelProps {
  ticketId: string
  locale: string
  subject: string
  body: string
  transcript: Array<{ role: "user" | "assistant"; content: string }>
}

export function DraftReplyPanel({
  ticketId,
  locale,
  subject,
  body,
  transcript,
}: DraftReplyPanelProps) {
  const t = useTranslations("admin.draftReply")
  const [tone, setTone] = useState<"warm" | "concise" | "technical">("concise")
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError(null)
    setDraft("")
    try {
      const res = await fetch("/api/admin/ai/draft-reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticketId,
          email: "support@averianlabs.eu",
          subject,
          body,
          transcript,
          tone,
          locale,
        }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { draft: string }
      setDraft(j.draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error")
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // ignore
    }
  }

  const toneLabel = (kind: "warm" | "concise" | "technical") => {
    if (kind === "warm") return t("toneWarm")
    if (kind === "concise") return t("toneConcise")
    return t("toneTechnical")
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
        {t("title")}
      </h2>
      <div className="mb-3 flex gap-1">
        {(["warm", "concise", "technical"] as const).map((toneKind) => (
          <button
            key={toneKind}
            type="button"
            onClick={() => setTone(toneKind)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium",
              tone === toneKind
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-surface text-ink-muted hover:bg-surface-2",
            )}
          >
            {toneLabel(toneKind)}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {loading ? t("drafting") : t("generate", { tone: toneLabel(tone) })}
      </button>

      {error ? <p className="mt-3 text-xs text-danger">{error}</p> : null}

      {draft ? (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">
              {t("charsCount", { count: draft.length })}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
            >
              {copied ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-[var(--radius)] bg-surface-2 p-3 text-sm text-ink">
            {draft}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
