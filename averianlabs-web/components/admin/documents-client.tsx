"use client"

import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/documents"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

interface DocumentRow {
  id: string
  type: string
  title: string
  version: string
  productName: string | null
  productSlug: string | null
  publishedAt: Date | string
}

interface AdminDocumentsClientProps {
  initialDocs: DocumentRow[]
  products: { id: string; slug: string; name: string }[]
}

export function AdminDocumentsClient({ initialDocs, products }: AdminDocumentsClientProps) {
  const t = useTranslations("admin.documentsClient")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<DocumentType>("coa")
  const [title, setTitle] = useState("")
  const [version, setVersion] = useState("1.0")
  const [productId, setProductId] = useState("")
  const [externalUrl, setExternalUrl] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const create = () => {
    if (!title.trim()) return
    startTransition(async () => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          version,
          productId: productId || null,
          externalUrl: externalUrl || null,
        }),
      })
      if (res.ok) {
        setOpen(false)
        setTitle("")
        setVersion("1.0")
        setProductId("")
        setExternalUrl("")
        router.refresh()
      }
    })
  }

  const remove = (id: string) => {
    setBusyId(id)
    startTransition(async () => {
      await fetch(`/api/documents/${id}`, { method: "DELETE" })
      setBusyId(null)
      router.refresh()
    })
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("newDocument")}
        </Button>
      </div>

      {initialDocs.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center text-sm text-ink-muted">
          {t("noDocuments")}
        </div>
      ) : (
        <div className="space-y-2">
          {initialDocs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{d.title}</p>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  {DOCUMENT_TYPE_LABELS[d.type as DocumentType] ?? d.type} · v{d.version} ·{" "}
                  {d.productName ?? "—"} · {new Date(d.publishedAt).toISOString().slice(0, 10)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(d.id)}
                disabled={busyId === d.id}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-ink-muted hover:bg-danger-soft hover:text-danger"
                aria-label={t("deleteAria")}
              >
                {busyId === d.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>{t("createDocument")}</DialogTitle>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="doc-type" className="mb-1.5 block text-xs font-medium text-ink-muted">
                {t("fieldType")}
              </label>
              <select
                id="doc-type"
                value={type}
                onChange={(e) => setType(e.target.value as DocumentType)}
                className="h-10 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t("fieldTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
            <Input
              label={t("fieldVersion")}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
            <div>
              <label
                htmlFor="doc-product"
                className="mb-1.5 block text-xs font-medium text-ink-muted"
              >
                {t("fieldProductOptional")}
              </label>
              <select
                id="doc-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="h-10 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
              >
                <option value="">{t("noneOption")}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t("fieldExternalUrlOptional")}
              hint={t("externalUrlHint")}
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder={t("externalUrlPlaceholder")}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button size="sm" onClick={create} disabled={isPending || !title.trim()}>
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {t("create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
