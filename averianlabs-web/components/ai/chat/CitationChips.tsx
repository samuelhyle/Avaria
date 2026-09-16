"use client"

import { ExternalLink } from "lucide-react"

import type { CitationRef } from "@/lib/ai/types"

const CHIP_CLASS =
  "inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-2xs font-medium text-ink-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent"

export function CitationChips({ citations }: { citations: CitationRef[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {citations.map((c) =>
        c.url ? (
          <a
            key={`${c.source}-${c.sourceId}-${c.index}`}
            href={c.url}
            className={CHIP_CLASS}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className="font-mono text-3xs text-accent">[{c.index}]</span>
            <span className="line-clamp-2 max-w-[200px] break-words text-left">{c.title}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
          </a>
        ) : (
          <span
            key={`${c.source}-${c.sourceId}-${c.index}`}
            className={CHIP_CLASS}
            aria-label={c.title}
          >
            <span className="font-mono text-3xs text-accent">[{c.index}]</span>
            <span className="line-clamp-2 max-w-[200px] break-words text-left">{c.title}</span>
          </span>
        ),
      )}
    </div>
  )
}
