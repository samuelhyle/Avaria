"use client"

import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/Dialog"
import type { Locale, Product } from "@/lib/products/types"
import { Command } from "cmdk"
import { ArrowRight, FlaskConical, Layers, Search, ShoppingBag } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

interface CommandPaletteProps {
  locale: Locale | string
  products: Product[]
}

const QUICK_LINKS = (locale: string) => [
  { href: `/${locale}/shop`, label: "Browse all peptides", icon: FlaskConical },
  { href: `/${locale}/lab-tests`, label: "Lab test methodology", icon: Layers },
  { href: `/${locale}/peptide-calculator`, label: "Reconstitution calculator", icon: FlaskConical },
  { href: `/${locale}/blog`, label: "Research blog", icon: FlaskConical },
  { href: `/${locale}/partner`, label: "Partner program", icon: ShoppingBag },
]

const RECENT_KEY = "averianlabs-recent-searches"

export function CommandPalette({ locale, products }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-ink/40 backdrop-blur-sm" />
        <DialogContent className="left-1/2 top-[12vh] max-w-2xl -translate-x-1/2 translate-y-0 border-line bg-surface/95 p-0 shadow-2xl backdrop-blur-xl">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command label="Search AverianLabs" className="rounded-[var(--radius-lg)]">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 text-ink-subtle" />
              <Command.Input
                placeholder="Search peptides, batch IDs, articles…"
                aria-label="Search"
                className="h-14 w-full bg-transparent text-base text-ink placeholder:text-ink-subtle focus:outline-none"
              />
              <kbd className="hidden font-mono text-3xs text-ink-subtle sm:inline">ESC</kbd>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="px-4 py-12 text-center text-sm text-ink-muted">
                No results. Try a peptide name like &ldquo;BPC-157&rdquo; or a CAS number.
              </Command.Empty>

              <Command.Group
                heading="Products"
                className="px-1 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-3xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-subtle"
              >
                {products.map((p) => {
                  const translation = p.translations?.[locale as Locale] ?? p.defaultTranslation
                  const minVial = p.vials.reduce(
                    (min, v) => (v.priceCents < min.priceCents ? v : min),
                    p.vials[0]!,
                  )
                  const isContact = minVial.contactOnly === true || minVial.priceCents === 0
                  return (
                    <Command.Item
                      key={p.slug}
                      value={`${p.slug} ${translation.name} ${p.casNumber ?? ""} ${minVial.sku}`}
                      onSelect={() => {
                        pushRecent(translation.name)
                        navigate(`/${locale}/shop/${p.slug}`)
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm text-ink aria-selected:bg-accent-soft aria-selected:text-accent-ink"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                        style={{
                          background: `linear-gradient(135deg, hsl(${p.hue} 70% 95%), hsl(${p.hue} 70% 75%))`,
                        }}
                      >
                        <FlaskConical
                          className="h-4 w-4"
                          style={{ color: `hsl(${p.hue} 70% 30%)` }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{translation.name}</div>
                        <div className="font-mono text-3xs text-ink-subtle">
                          {minVial.sku} · {p.casNumber ?? translation.tagline}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-ink-muted">
                        {isContact ? "Quote" : `€${(minVial.priceCents / 100).toFixed(2)}`}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-ink-subtle" />
                    </Command.Item>
                  )
                })}
              </Command.Group>

              <Command.Separator className="my-1 h-px bg-line" />

              <Command.Group
                heading="Quick links"
                className="px-1 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-3xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-subtle"
              >
                {QUICK_LINKS(locale).map((link) => (
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
                    heading="Recent"
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
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface px-1 font-mono">↵</kbd> open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface px-1 font-mono">esc</kbd>{" "}
                  close
                </span>
              </div>
              <span className="font-mono">{products.length} products indexed</span>
            </div>
          </Command>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
