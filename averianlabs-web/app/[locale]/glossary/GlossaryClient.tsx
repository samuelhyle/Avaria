"use client"

import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import type { GlossaryCategory, GlossaryTranslation } from "@/lib/knowledge/glossary"
import type { Locale } from "@/lib/products/types"
import { BookText, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useMemo, useState } from "react"

interface GlossaryClientItem {
  slug: string
  category: GlossaryCategory
  translation: GlossaryTranslation
}

interface GlossaryClientProps {
  locale: Locale
  categories: GlossaryCategory[]
  items: GlossaryClientItem[]
}

export function GlossaryClient({ locale, categories, items }: GlossaryClientProps) {
  const t = useTranslations("glossary")
  const tKb = useTranslations("knowledge")
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<GlossaryCategory | "all">("all")

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) return false
      if (!needle) return true
      const tr = item.translation
      const haystack = `${tr.term} ${tr.short} ${tr.long}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [items, query, activeCategory])

  const groupedByCategory = useMemo(() => {
    const map: Partial<Record<GlossaryCategory, GlossaryClientItem[]>> = {}
    for (const item of filtered) {
      const bucket = map[item.category] ?? []
      bucket.push(item)
      map[item.category] = bucket
    }
    return map
  }, [filtered])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label={t("searchPlaceholder")}
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={
              activeCategory === "all"
                ? "inline-flex items-center rounded-full border border-accent bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                : "inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
            }
          >
            {t("filterAll")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={
                activeCategory === cat
                  ? "inline-flex items-center rounded-full border border-accent bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                  : "inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
              }
            >
              {t(`categories.${cat}`)}
              <Badge tone="muted" size="sm" className="ml-1">
                {items.filter((i) => i.category === cat).length}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center">
          <Search className="mx-auto mb-3 h-6 w-6 text-ink-subtle" />
          <p className="text-sm text-ink-muted">{t("noResults")}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          <aside className="space-y-2 text-sm md:sticky md:top-20 md:self-start">
            {categories.map((cat) => {
              const itemsInCat = groupedByCategory[cat] ?? []
              if (itemsInCat.length === 0) return null
              return (
                <a
                  key={cat}
                  href={`#cat-${cat}`}
                  className="flex items-center justify-between rounded-[var(--radius)] border border-line bg-surface px-3 py-2 transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
                >
                  <span className="font-medium text-ink">{t(`categories.${cat}`)}</span>
                  <Badge tone="muted" size="sm">
                    {itemsInCat.length}
                  </Badge>
                </a>
              )
            })}
          </aside>

          <div className="space-y-10">
            {categories.map((cat) => {
              const itemsInCat = groupedByCategory[cat] ?? []
              if (itemsInCat.length === 0) return null
              return (
                <section key={cat} id={`cat-${cat}`} className="scroll-mt-24">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
                    {t(`categories.${cat}`)}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {itemsInCat.map((item) => {
                      const tr = item.translation
                      return (
                        <Link
                          key={item.slug}
                          href={`/${locale}/glossary/${item.slug}`}
                          className="group flex h-full flex-col rounded-[var(--radius)] border border-line bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-accent-soft/30"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-ink group-hover:text-accent">
                              {tr.term}
                            </h3>
                            <BookText className="h-4 w-4 shrink-0 text-ink-subtle group-hover:text-accent" />
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs font-medium text-ink-muted">
                            {tr.short}
                          </p>
                          <p className="mt-1 line-clamp-3 text-2xs text-ink-muted">{tr.long}</p>
                          {tr.relatedSlugs && tr.relatedSlugs.length > 0 ? (
                            <p className="mt-2 text-2xs text-ink-subtle">{t("relatedProducts")}</p>
                          ) : null}
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-2xs text-ink-subtle">{tKb("itemsCount", { count: filtered.length })}</p>
    </div>
  )
}
