"use client"

import type { CitationRef } from "@/lib/ai/types"
import { cn } from "@/lib/utils/cn"
import {
  BookText,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  Newspaper,
  ScrollText,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo } from "react"

const SOURCE_ICONS: Record<string, LucideIcon> = {
  product: FlaskConical,
  coa: FileText,
  glossary: BookText,
  blog: Newspaper,
  document: ScrollText,
}

export function sourceIcon(source: string): LucideIcon {
  return SOURCE_ICONS[source] ?? ScrollText
}

interface SourcesPanelProps {
  citations: CitationRef[]
  showSources: boolean
  onToggle: () => void
}

export function SourcesPanel({ citations, showSources, onToggle }: SourcesPanelProps) {
  const t = useTranslations("averia")
  const tKb = useTranslations("knowledge")

  const ordered = useMemo(() => {
    const dedupe = new Map<string, CitationRef>()
    for (const c of citations) {
      const key = `${c.source}:${c.sourceId}`
      if (!dedupe.has(key)) dedupe.set(key, c)
    }
    return Array.from(dedupe.values()).sort((a, b) => a.index - b.index)
  }, [citations])

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-sm font-semibold"
        aria-expanded={showSources}
      >
        <span className="flex items-center gap-2">
          {showSources ? (
            <EyeOff className="h-4 w-4 text-accent" />
          ) : (
            <Eye className="h-4 w-4 text-accent" />
          )}
          {t("sourcesHeading")}
        </span>
        <span className="text-2xs text-ink-muted">
          {t("sourcesCount", { count: ordered.length })}
        </span>
      </button>
      {showSources ? (
        <div className="border-t border-line px-5 py-3">
          {ordered.length === 0 ? (
            <p className="text-xs text-ink-muted">{t("noSources")}</p>
          ) : (
            <ul className="space-y-2">
              {ordered.map((cite) => {
                const Icon = sourceIcon(cite.source)
                const sourceType = t(`sourceTypes.${cite.source}`) ?? tKb("links.articles")
                return (
                  <li key={`${cite.source}-${cite.sourceId}`}>
                    <a
                      href={cite.url ?? "#"}
                      target={cite.url ? "_blank" : undefined}
                      rel={cite.url ? "noreferrer noopener" : undefined}
                      className={cn(
                        "flex items-start gap-2.5 rounded-[var(--radius)] border border-line/60 px-3 py-2 transition-colors",
                        cite.url
                          ? "hover:border-accent/40 hover:bg-accent-soft/30"
                          : "cursor-default opacity-70",
                      )}
                    >
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <Icon className="h-3 w-3" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-ink">
                            {cite.title}
                          </span>
                          <span className="font-mono text-3xs text-accent">[{cite.index}]</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-2xs text-ink-muted">
                          <span className="rounded-full border border-line bg-surface-2 px-1.5 py-0.5">
                            {sourceType}
                          </span>
                          {cite.url ? (
                            <ExternalLink className="h-2.5 w-2.5 opacity-60" aria-hidden />
                          ) : null}
                        </div>
                      </div>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
