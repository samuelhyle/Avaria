"use client"

import { Button } from "@/components/ui/Button"
import { getConsentState, setConsentState } from "@/lib/ai/memory/consent-client"
import { Loader2, Sparkles, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface MemoryRow {
  id: string
  key: string
  value: unknown
  source: string
  updatedAt: string
}

function displayValue(value: unknown): string {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function AiMemoryPanel() {
  const t = useTranslations("account")
  const [memories, setMemories] = useState<MemoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [consent, setConsent] = useState<"accepted" | "declined" | "unset">("unset")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/memory")
      if (res.ok) {
        const data = (await res.json()) as { memories?: MemoryRow[] }
        setMemories(data.memories ?? [])
      }
    } catch {
      // Panel is best-effort.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setConsent(getConsentState())
    void load()
  }, [load])

  const updateConsent = (state: "accepted" | "declined") => {
    setConsentState(state)
    setConsent(state)
    toast.success(state === "accepted" ? t("aiConsentOnToast") : t("aiConsentOffToast"))
  }

  const remove = async (key: string) => {
    const res = await fetch(`/api/ai/memory?key=${encodeURIComponent(key)}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error(t("aiMemoryError"))
      return
    }
    setMemories((prev) => prev.filter((m) => m.key !== key))
  }

  const removeAll = async () => {
    const res = await fetch("/api/ai/memory", { method: "DELETE" })
    if (!res.ok) {
      toast.error(t("aiMemoryError"))
      return
    }
    setMemories([])
  }

  return (
    <div className="rounded-[var(--radius-xl)] border border-line bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden />
            {t("aiMemoryTitle")}
          </h3>
          <p className="mt-1 max-w-lg text-sm text-ink-muted">{t("aiMemoryBody")}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-ink-muted">
          {consent === "accepted" ? t("aiConsentOn") : t("aiConsentOff")}
        </span>
        {consent === "accepted" ? (
          <Button variant="outline" size="sm" onClick={() => updateConsent("declined")}>
            {t("aiDecline")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => updateConsent("accepted")}>
            {t("aiAllow")}
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("aiLoading")}
          </div>
        ) : memories.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-dashed border-line bg-surface-2 p-4 text-sm text-ink-muted">
            {t("aiEmpty")}
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {memories.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface-2 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">
                      <span className="font-mono text-xs text-ink-subtle">{m.key}</span>{" "}
                      {displayValue(m.value)}
                    </p>
                    <p className="mt-0.5 text-3xs text-ink-subtle">
                      {m.source === "explicit" ? t("aiSourceExplicit") : t("aiSourceInferred")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(m.key)}
                    aria-label={t("aiDelete")}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Button variant="ghost" size="sm" onClick={removeAll}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {t("aiDeleteAll")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
