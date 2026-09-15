"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { cn } from "@/lib/utils/cn"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

interface ComposerProps {
  categories: { slug: string; nameKey: string }[]
  defaultCategory?: string
  isAuthed: boolean
  signInHref: string
  locale: string
}

export function ThreadComposer({
  categories,
  defaultCategory,
  isAuthed,
  signInHref,
  locale,
}: ComposerProps) {
  const t = useTranslations("community")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [categorySlug, setCategorySlug] = useState(defaultCategory ?? categories[0]?.slug ?? "")
  const [error, setError] = useState<{ reason: string; ruleCodes: string[] } | null>(null)

  if (!isAuthed) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-accent-soft p-6 text-center">
        <p className="text-sm text-ink-muted">{t("signInToPost")}</p>
        <a
          href={signInHref}
          className="mt-3 inline-flex h-9 items-center rounded-[var(--radius)] bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          {t("signInCta")}
        </a>
      </div>
    )
  }

  const submit = () => {
    if (!title.trim() || !body.trim() || !categorySlug) return
    setError(null)
    startTransition(async () => {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categorySlug, title, body }),
      })
      const data = (await res.json()) as
        | { ok: true; threadId: string; slug: string }
        | { ok: false; reason: string; ruleCodes: string[] }
      if (!data.ok) {
        setError({ reason: data.reason, ruleCodes: data.ruleCodes })
        return
      }
      router.push(`/${locale}/community/thread/${data.slug}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5 rounded-[var(--radius-lg)] border border-line bg-surface p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{t("newThreadTitle")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("newThreadSub")}</p>
      </div>

      <div>
        <label
          htmlFor="category-select"
          className="mb-1.5 block text-xs font-medium text-ink-muted"
        >
          {t("fieldCategory")}
        </label>
        <select
          id="category-select"
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="h-10 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {t(`categories.${resolveCategoryKey(c.nameKey)}.name` as never)}
            </option>
          ))}
        </select>
      </div>

      <Input
        label={t("fieldTitle")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={140}
        placeholder="Be specific…"
      />

      <div>
        <label htmlFor="thread-body" className="mb-1.5 block text-xs font-medium text-ink-muted">
          {t("fieldBody")}
        </label>
        <textarea
          id="thread-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          maxLength={8000}
          placeholder="Markdown supported. Cite sources where possible."
          className={cn(
            "w-full rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-sm leading-relaxed placeholder:text-ink-subtle focus:border-accent focus:outline-none",
            error && "border-danger focus:border-danger",
          )}
        />
        <p className="mt-1 text-xs text-ink-subtle">{t("fieldBodyHint")}</p>
      </div>

      {error ? (
        <div className="rounded-[var(--radius)] border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          <p className="font-medium">{t("errorTitleShort")}</p>
          <p className="mt-1 text-xs">{error.reason}</p>
          {error.ruleCodes.length > 0 ? (
            <p className="mt-1 font-mono text-2xs text-danger/80">{error.ruleCodes.join(", ")}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button onClick={submit} disabled={isPending || !title.trim() || !body.trim()}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isPending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </div>
  )
}

function resolveCategoryKey(nameKey: string): string {
  const parts = nameKey.split(".")
  return parts[parts.length - 2] ?? ""
}
