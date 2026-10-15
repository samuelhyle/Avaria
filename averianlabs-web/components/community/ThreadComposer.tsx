"use client"
import { PostMarkdown } from "@/components/community/PostMarkdown"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
interface ComposerProps {
  categories: { slug: string; nameKey: string }[]
  defaultCategory?: string
  isAuthed: boolean
  signInHref: string
  locale: string
  initialBody?: string
  initialTitle?: string
}
export function ThreadComposer({
  categories,
  defaultCategory,
  isAuthed,
  signInHref,
  locale,
  initialBody = "",
  initialTitle = "",
}: ComposerProps) {
  const t = useTranslations("community")
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [categorySlug, setCategorySlug] = useState(defaultCategory ?? "research-discussion")
  const [pending, setPending] = useState(false)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({ title: "", body: "", categorySlug: defaultCategory ?? "research-discussion" }),
  )
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<"load" | "clear" | null>(null)
  const currentSnapshot = JSON.stringify({ title, body, categorySlug })
  const dirty = currentSnapshot !== savedSnapshot
  useEffect(() => {
    if (!isAuthed || !dirty || submitted) return
    const preserveWork = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", preserveWork)
    return () => window.removeEventListener("beforeunload", preserveWork)
  }, [isAuthed, dirty, submitted])
  if (!isAuthed)
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <h1 className="mb-3 text-xl font-semibold">{t("newThreadTitle")}</h1>
        <p className="text-sm text-ink-muted">{t("signInToPost")}</p>
        <a
          className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm text-on-accent"
          href={signInHref}
        >
          {t("signInCta")}
        </a>
      </div>
    )
  const submit = async () => {
    if (!title.trim() || !body.trim()) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categorySlug, title, body, locale: locale === "fi" ? "fi" : "en" }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(
          t(
            data.ruleCodes?.includes("rate_limited")
              ? "rateLimited"
              : data.ruleCodes?.length
                ? "reviewBlocked"
                : "requestFailed",
          ),
        )
        return
      }
      setSubmitted(true)
      router.push(`/${locale}/community/thread/${data.slug}`)
    } catch {
      setError(t("requestFailed"))
    } finally {
      setPending(false)
    }
  }
  const draft = async (action: "save" | "load" | "clear") => {
    setPending(true)
    setError(null)
    setDraftNotice(null)
    const requestedSnapshot = currentSnapshot
    try {
      const res = await fetch(
        "/api/forum/drafts",
        action === "save"
          ? {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                title,
                body,
                categorySlug,
                locale: locale === "fi" ? "fi" : "en",
              }),
            }
          : action === "clear"
            ? { method: "DELETE" }
            : {},
      )
      if (!res.ok) throw new Error()
      if (action === "load") {
        const data = await res.json()
        if (data.draft) {
          setTitle(data.draft.title)
          setBody(data.draft.body)
          setCategorySlug(data.draft.categorySlug)
          setSavedSnapshot(
            JSON.stringify({
              title: data.draft.title,
              body: data.draft.body,
              categorySlug: data.draft.categorySlug,
            }),
          )
          const updated = new Date(data.draft.updatedAt)
          setLastSavedAt(Number.isFinite(updated.getTime()) ? updated : null)
          setDraftNotice(t("draftLoaded"))
        } else {
          setDraftNotice(t("noDraft"))
          toast.info(t("noDraft"))
        }
      } else if (action === "save") {
        setSavedSnapshot(requestedSnapshot)
        setLastSavedAt(new Date())
        setDraftNotice(t("draftSaved"))
        toast.success(t("draftSaved"))
      } else {
        setSavedSnapshot(JSON.stringify({ title: "", body: "", categorySlug }))
        setLastSavedAt(null)
        setDraftNotice(t("draftRemovedEditorKept"))
        toast.success(t("draftCleared"))
      }
    } catch {
      setError(t("requestFailed"))
    } finally {
      setPending(false)
    }
  }
  const requestDraftAction = (action: "load" | "clear") => {
    if (action === "clear" || dirty) setConfirmation(action)
    else void draft(action)
  }
  return (
    <div className="space-y-5 rounded-xl border border-line bg-surface p-5 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("newThreadTitle")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("newThreadSub")}</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {["question", "methods", "document"].map((kind) => (
          <Button
            size="sm"
            variant="outline"
            key={kind}
            disabled={pending || !!body.trim()}
            onClick={() => setBody(t(`template${kind}` as never))}
          >
            {t(`type${kind}` as never)}
          </Button>
        ))}
      </div>
      <label className="block text-sm font-medium text-ink-muted">
        {t("fieldCategory")}
        <select
          value={categorySlug}
          disabled={pending || submitted}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border bg-surface px-3 text-base text-ink"
        >
          {categories.map((c) => (
            <option value={c.slug} key={c.slug}>
              {t(c.nameKey.replace("community.", "") as never)}
            </option>
          ))}
        </select>
      </label>
      <Input
        label={t("fieldTitle")}
        value={title}
        disabled={pending || submitted}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={140}
        placeholder={t("titlePlaceholder")}
      />
      <label className="block text-sm font-medium text-ink-muted">
        {t("fieldBody")}
        <textarea
          value={body}
          disabled={pending || submitted}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          maxLength={8000}
          placeholder={t("bodyPlaceholder")}
          className="mt-1.5 w-full rounded-lg border bg-surface px-3 py-3 text-base leading-relaxed text-ink"
        />
      </label>
      <p className="text-sm leading-relaxed text-ink-muted">{t("fieldBodyHint")}</p>
      <div className="space-y-1 rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink-muted">
        <p>{t("privateDraftNotice")}</p>
        <p className="font-medium text-ink">
          {dirty ? t("unsavedChanges") : lastSavedAt ? t("draftUpToDate") : t("noSavedChanges")}
        </p>
        {lastSavedAt && (
          <p>
            {t("lastSaved", {
              time: new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(lastSavedAt),
            })}
          </p>
        )}
        {draftNotice && <p role="status">{draftNotice}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setPreview(!preview)}>
          {t(preview ? "hidePreview" : "preview")}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => void draft("save")}>
          {t("saveDraft")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending || submitted}
          onClick={() => requestDraftAction("load")}
        >
          {t("loadDraft")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending || submitted}
          onClick={() => requestDraftAction("clear")}
        >
          {t("clearDraft")}
        </Button>
      </div>
      {preview && (
        <section className="rounded-lg border border-line bg-surface-2 p-4">
          <h2 className="mb-4 font-semibold">{title || t("preview")}</h2>
          <PostMarkdown body={body} />
        </section>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {submitted && (
        <p role="status" className="text-sm text-ink-muted">
          {t("pendingReview")}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <p className="max-w-sm text-sm leading-relaxed text-ink-muted">{t("pendingPolicy")}</p>
        <Button
          disabled={pending || !title.trim() || !body.trim() || submitted}
          onClick={() => void submit()}
        >
          {t(pending ? "submitting" : "submit")}
        </Button>
      </div>
      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null)
        }}
      >
        <DialogContent>
          <DialogTitle>
            {t(confirmation === "clear" ? "removeDraftTitle" : "replaceDraftTitle")}
          </DialogTitle>
          <DialogDescription>
            {t(confirmation === "clear" ? "removeDraftBody" : "replaceDraftBody")}
          </DialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmation(null)}>
              {t("keepEditing")}
            </Button>
            <Button
              variant={confirmation === "clear" ? "danger" : "primary"}
              onClick={() => {
                const action = confirmation
                setConfirmation(null)
                if (action) void draft(action)
              }}
            >
              {t(confirmation === "clear" ? "removeSavedDraft" : "replaceEditor")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
