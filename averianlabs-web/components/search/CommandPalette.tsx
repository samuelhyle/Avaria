"use client"

import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/Dialog"
import type { Locale, Product } from "@/lib/products/types"
import { findCheapestVial, isContactOnly } from "@/lib/products/vials"
import { formatCurrency } from "@/lib/utils/format"
import { Command } from "cmdk"
import {
  ArrowRight,
  Beaker,
  FileCheck2,
  FlaskConical,
  Layers,
  Search,
  ShoppingBag,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

interface CommandPaletteProps {
  locale: Locale | string
  products: Product[]
}

const QUICK_LINKS = (locale: string, t: ReturnType<typeof useTranslations<string>>) => [
  { href: `/${locale}/shop`, label: t("quickLinks.shop"), icon: FlaskConical },
  { href: `/${locale}/lab-tests`, label: t("quickLinks.labTests"), icon: Layers },
  { href: `/${locale}/peptide-calculator`, label: t("quickLinks.calculator"), icon: FlaskConical },
  { href: `/${locale}/blog`, label: t("quickLinks.blog"), icon: FlaskConical },
  { href: `/${locale}/partner`, label: t("quickLinks.partner"), icon: ShoppingBag },
]

const RECENT_KEY = "averianlabs-recent-searches"

/**
 * Locale-aware normalization: lowercases, removes diacritics (Finnish ä→a,
   ö→o etc.) and trims whitespace. Used to make "BPC" / "BPC-157" / "bpc 157"
   all match the same product regardless of input casing.
 */
function normalize(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim()
}

/**
 * Splits `query` into whitespace-separated tokens that must each appear
   (substring) in `haystack`. Returns the substring match positions so the
   caller can highlight matched ranges.
 */
function findMatchRanges(query: string, haystack: string): Array<[number, number]> | null {
  const q = normalize(query)
  if (!q) return null
  const h = normalize(haystack)
  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null

  let cursor = 0
  const ranges: Array<[number, number]> = []
  for (const token of tokens) {
    const idx = h.indexOf(token, cursor)
    if (idx === -1) return null
    ranges.push([idx, idx + token.length])
    cursor = idx + token.length
  }
  return ranges
}

interface HighlightableTextProps {
  text: string
  query: string
  className?: string
}

function HighlightableText({ text, query, className }: HighlightableTextProps) {
  const ranges = findMatchRanges(query, text)
  if (!ranges || ranges.length === 0) {
    return <span className={className}>{text}</span>
  }
  const parts: Array<{ text: string; matched: boolean }> = []
  let cursor = 0
  for (const [start, end] of ranges) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), matched: false })
    parts.push({ text: text.slice(start, end), matched: true })
    cursor = end
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), matched: false })
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.matched ? (
          <mark
            key={`${i}-${p.text}`}
            className="rounded-[2px] bg-accent-soft px-0.5 text-accent-ink"
          >
            {p.text}
          </mark>
        ) : (
          <span key={`${i}-${p.text}`}>{p.text}</span>
        ),
      )}
    </span>
  )
}

export function CommandPalette({ locale, products }: CommandPaletteProps) {
  const t = useTranslations("search")
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const eventHandler = () => setOpen(true)
    document.addEventListener("keydown", handler)
    window.addEventListener("averianlabs:open-search", eventHandler)
    return () => {
      document.removeEventListener("keydown", handler)
      window.removeEventListener("averianlabs:open-search", eventHandler)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const saved = localStorage.getItem(RECENT_KEY)
    if (saved) setRecent(JSON.parse(saved))
  }, [open])

  const pushRecent = useCallback(
    (value: string) => {
      const next = [value, ...recent.filter((v) => v !== value)].slice(0, 5)
      setRecent(next)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    },
    [recent],
  )

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  // Build a search haystack per product, including batch codes and CAS.
  // `commandValue` is what cmdk filters against; we also keep separate
  // human-readable snippets for highlighting.
  type Indexed = {
    product: Product
    translation: Product["defaultTranslation"]
    minVial: Product["vials"][number]
    haystack: string
    batchCode: string | null
    category: Product["category"]
  }

  const indexed: Indexed[] = useMemo(
    () =>
      products
        .map((p) => {
          const translation = p.translations?.[locale as Locale] ?? p.defaultTranslation
          const minVial = findCheapestVial(p)
          if (!minVial) return null
          const haystack = [
            p.slug,
            translation.name,
            translation.tagline,
            translation.description,
            p.casNumber ?? "",
            p.category,
            p.latestBatch?.code ?? "",
            minVial.sku,
          ]
            .filter(Boolean)
            .join(" ")
          return {
            product: p,
            translation,
            minVial,
            haystack,
            batchCode: p.latestBatch?.code ?? null,
            category: p.category,
          }
        })
        .filter((entry): entry is Indexed => entry !== null),
    [products, locale],
  )

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return indexed
    return indexed.filter((entry) => findMatchRanges(q, entry.haystack) !== null)
  }, [indexed, query])

  const isContactFor = (entry: Indexed) => isContactOnly(entry.minVial)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-ink/40 backdrop-blur-sm" />
        <DialogContent className="left-1/2 top-[12vh] max-w-2xl -translate-x-1/2 translate-y-0 border-line bg-surface/95 p-0 shadow-2xl backdrop-blur-xl">
          <DialogTitle className="sr-only">{t("label")}</DialogTitle>
          <Command label={t("commandLabel")} className="rounded-[var(--radius-lg)]">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 text-ink-subtle" />
              <Command.Input
                placeholder={t("inputPlaceholder")}
                aria-label={t("inputAria")}
                value={query}
                onValueChange={setQuery}
                className="h-14 w-full bg-transparent text-base text-ink placeholder:text-ink-subtle focus:outline-none"
              />
              <kbd className="hidden font-mono text-3xs text-ink-subtle sm:inline">ESC</kbd>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="px-4 py-12 text-center text-sm text-ink-muted">
                {t("empty")}
              </Command.Empty>

              <Command.Group
                heading={`${t("groupProducts")} · ${t("searchResultsCount", { count: filtered.length })}`}
                className="px-1 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-3xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-subtle"
              >
                {filtered.map((entry) => {
                  const { product, translation, minVial, batchCode, category } = entry
                  const isContact = isContactFor(entry)
                  const searchValue = `${product.slug} ${translation.name} ${translation.tagline} ${product.casNumber ?? ""} ${batchCode ?? ""} ${minVial.sku} ${category}`
                  return (
                    <Command.Item
                      key={product.slug}
                      value={searchValue}
                      onSelect={() => {
                        pushRecent(translation.name)
                        navigate(`/${locale}/shop/${product.slug}`)
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm text-ink aria-selected:bg-accent-soft aria-selected:text-accent-ink"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                        style={{
                          background: `linear-gradient(135deg, hsl(${product.hue} 70% 95%), hsl(${product.hue} 70% 75%))`,
                        }}
                      >
                        <FlaskConical
                          className="h-4 w-4"
                          style={{ color: `hsl(${product.hue} 70% 30%)` }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <HighlightableText
                            text={translation.name}
                            query={query}
                            className="font-medium truncate"
                          />
                          <span className="rounded-full border border-line bg-surface-2 px-1.5 py-0.5 text-3xs uppercase tracking-wider text-ink-subtle">
                            {category}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 font-mono text-3xs text-ink-subtle">
                          {batchCode ? (
                            <span className="inline-flex items-center gap-1">
                              <Beaker className="h-3 w-3" />
                              <HighlightableText text={batchCode} query={query} />
                            </span>
                          ) : null}
                          <span>·</span>
                          <HighlightableText text={minVial.sku} query={query} />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 text-xs font-medium text-ink-muted">
                        <span>
                          {isContact
                            ? t("quote")
                            : formatCurrency(minVial.priceCents, "EUR", locale)}
                        </span>
                        {batchCode ? (
                          <span className="inline-flex items-center gap-0.5 text-3xs text-success">
                            <FileCheck2 className="h-2.5 w-2.5" />
                            COA
                          </span>
                        ) : null}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-ink-subtle" />
                    </Command.Item>
                  )
                })}
              </Command.Group>

              <Command.Separator className="my-1 h-px bg-line" />

              <Command.Group
                heading={t("groupQuickLinks")}
                className="px-1 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-3xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-subtle"
              >
                {QUICK_LINKS(locale, t).map((link) => (
                  <Command.Item
                    key={link.href}
                    value={link.label}
                    onSelect={() => navigate(link.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm text-ink aria-selected:bg-accent-soft aria-selected:text-accent-ink"
                  >
                    <link.icon className="h-4 w-4 text-ink-muted" />
                    <span className="flex-1">{link.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-subtle" />
                  </Command.Item>
                ))}
              </Command.Group>

              {recent.length > 0 ? (
                <>
                  <Command.Separator className="my-1 h-px bg-line" />
                  <Command.Group
                    heading={t("groupRecent")}
                    className="px-1 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-3xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-subtle"
                  >
                    {recent.map((term) => (
                      <Command.Item
                        key={term}
                        value={term}
                        onSelect={() => navigate(`/${locale}/shop`)}
                        className="flex cursor-pointer items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm text-ink-muted aria-selected:bg-accent-soft aria-selected:text-accent-ink"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span className="flex-1">{term}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              ) : null}
            </Command.List>

            <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-4 py-2 text-3xs text-ink-subtle">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface px-1 font-mono">↑↓</kbd>{" "}
                  {t("hintNavigate")}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface px-1 font-mono">↵</kbd>{" "}
                  {t("hintOpen")}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface px-1 font-mono">esc</kbd>{" "}
                  {t("hintClose")}
                </span>
              </div>
              <span className="font-mono">{t("productsIndexed", { count: products.length })}</span>
            </div>
          </Command>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
