"use client"

import { FileWarning, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

// Dynamic import so the worker setup only happens client-side
const Document = dynamic(() => import("react-pdf").then((m) => m.Document), {
  ssr: false,
  loading: () => <PdfSkeleton />,
})
const Page = dynamic(() => import("react-pdf").then((m) => m.Page), { ssr: false })

interface PdfViewerProps {
  url: string
  title: string
}

export function PdfViewer({ url, title }: PdfViewerProps) {
  const t = useTranslations("research")
  const [preview, setPreview] = useState(false)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [width, setWidth] = useState<number>(800)

  useEffect(() => {
    if (!preview) return
    const update = () => {
      const el = document.getElementById("pdf-viewport")
      if (el) setWidth(Math.max(160, el.clientWidth - 32))
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [preview])

  useEffect(() => {
    if (!preview) return
    let cancelled = false
    void (async () => {
      try {
        const { pdfjs } = await import("react-pdf")
        if (!cancelled) {
          // Serve the worker from our own bundle so the production CSP
          // (`worker-src 'self' blob:`) works without allow-listing a CDN.
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).toString()
        }
      } catch {
        // best-effort; react-pdf falls back if worker not set
      }
    })()
    return () => {
      cancelled = true
    }
  }, [preview])

  if (!preview)
    return (
      <button
        type="button"
        className="min-h-11 rounded-[var(--radius)] border border-line px-4 py-2 text-sm"
        onClick={() => setPreview(true)}
      >
        {t("previewDocument")}
      </button>
    )
  if (loadError) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-6 text-center sm:p-8"
      >
        <FileWarning className="mx-auto mb-3 h-6 w-6 text-warn" />
        <p className="text-sm text-ink-muted">{t("pdfFailed")}</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(null)
            setPageNumber(1)
          }}
          className="mt-4 mr-4 inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-medium"
        >
          {t("retry")}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          {t("download")} →
        </a>
      </div>
    )
  }

  return (
    <div
      id="pdf-viewport"
      className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 break-words text-sm text-ink-muted">{title}</p>
        {numPages > 1 ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber === 1}
              className="rounded-[var(--radius)] border border-line bg-surface px-2.5 py-1.5 text-ink-muted disabled:opacity-50"
            >
              ← {t("previous")}
            </button>
            <span className="font-mono text-ink-muted">
              {pageNumber} / {numPages}
            </span>
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber === numPages}
              className="rounded-[var(--radius)] border border-line bg-surface px-2.5 py-1.5 text-ink-muted disabled:opacity-50"
            >
              {t("next")} →
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex justify-center">
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={(err) => setLoadError(err.message)}
          loading={<PdfSkeleton />}
          className="pdf-document"
        >
          <Page
            pageNumber={pageNumber}
            width={width}
            renderAnnotationLayer={false}
            renderTextLayer
            className="rounded-[var(--radius)] border border-line bg-white shadow-sm"
          />
        </Document>
      </div>
    </div>
  )
}

function PdfSkeleton() {
  const t = useTranslations("research")
  return (
    <div className="flex h-[400px] items-center justify-center rounded-[var(--radius)] border border-dashed border-line bg-surface-2 text-sm text-ink-muted">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {t("pdfLoading")}
    </div>
  )
}
