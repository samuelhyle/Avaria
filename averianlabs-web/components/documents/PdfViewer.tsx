"use client"

import { FileWarning, Loader2 } from "lucide-react"
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
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [width, setWidth] = useState<number>(800)

  useEffect(() => {
    const update = () => {
      const el = document.getElementById("pdf-viewport")
      if (el) setWidth(Math.max(320, el.clientWidth - 32))
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
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
  }, [])

  if (loadError) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-12 text-center">
        <FileWarning className="mx-auto mb-3 h-6 w-6 text-warn" />
        <p className="text-sm text-ink-muted">Couldn't load PDF: {loadError}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          Open in new tab →
        </a>
      </div>
    )
  }

  return (
    <div
      id="pdf-viewport"
      className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-ink-muted">{title}</p>
        {numPages > 1 ? (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber === 1}
              className="rounded-[var(--radius)] border border-line bg-surface px-2.5 py-1.5 text-ink-muted disabled:opacity-50"
            >
              ← Prev
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
              Next →
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
  return (
    <div className="flex h-[400px] items-center justify-center rounded-[var(--radius)] border border-dashed border-line bg-surface-2 text-sm text-ink-muted">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading PDF…
    </div>
  )
}
