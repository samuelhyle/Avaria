"use client"

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher"
import { Logo } from "@/components/layout/Logo"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { useCart } from "@/lib/cart/store"
import { useOverlay } from "@/lib/hooks/use-overlay"
import { CATEGORIES } from "@/lib/products/categories"
import { cn } from "@/lib/utils/cn"
import { ChevronRight, Menu, Search, ShoppingCart, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { type CSSProperties, useState } from "react"

interface MobileMenuProps {
  locale: string
  productsCount: number
}

export function MobileMenu({ locale, productsCount }: MobileMenuProps) {
  const t = useTranslations("nav")
  const tShop = useTranslations("shop")
  const [open, setOpen] = useState(false)
  const count = useCart((s) => s.count())
  const openCart = useCart((s) => s.open)

  const openSearch = () => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent("averianlabs:open-search"))
  }

  const handleClose = () => setOpen(false)

  const linkClick = () => setOpen(false)

  const containerRef = useOverlay({ open, onClose: handleClose })

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-muted hover:bg-surface-2 hover:text-ink"
      >
        <Menu className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("close")}
            onClick={handleClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-in fade-in-0"
          />
          <aside
            ref={containerRef}
            id="mobile-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("openMenu")}
            className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl animate-in slide-in-from-right"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <Logo href={`/${locale}`} size="sm" onClick={linkClick} />
              <button
                type="button"
                onClick={handleClose}
                aria-label={t("close")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              <button
                type="button"
                onClick={openSearch}
                className="flex w-full items-center gap-2 rounded-[var(--radius)] border border-line bg-surface-2 px-3 py-2.5 text-left text-sm text-ink-subtle"
              >
                <Search className="h-4 w-4" />
                <span>{tShop("search")}</span>
                <span className="ml-auto font-mono text-3xs">⌘K</span>
              </button>

              <div className="mt-6">
                <h3 className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
                  {t("sectionShop")}
                </h3>
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link
                      href={`/${locale}/shop`}
                      onClick={linkClick}
                      className="flex items-center justify-between rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-2"
                    >
                      <span>{t("allProducts")}</span>
                      <span className="font-mono text-3xs text-ink-subtle">{productsCount}</span>
                    </Link>
                  </li>
                  {CATEGORIES.map(({ slug, icon: Icon, hue }) => (
                    <li key={slug}>
                      <Link
                        href={`/${locale}/shop?category=${slug}`}
                        onClick={linkClick}
                        className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink"
                      >
                        <div
                          className="hue-chip flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]"
                          style={{ "--cat-hue": hue } as CSSProperties}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="flex-1 capitalize">{slug}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <h3 className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
                  {t("sectionResearch")}
                </h3>
                <ul className="mt-2 space-y-1">
                  {[
                    { href: `/${locale}/lab-tests`, label: t("labTests") },
                    { href: `/${locale}/peptide-calculator`, label: t("calculator") },
                    { href: `/${locale}/blog`, label: t("blog") },
                    { href: `/${locale}/glossary`, label: t("glossary") },
                    { href: `/${locale}/documents`, label: t("documents") },
                    { href: `/${locale}/coa`, label: t("coaLibrary") },
                    { href: `/${locale}/community`, label: t("community") },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={linkClick}
                        className="flex items-center justify-between rounded-[var(--radius)] px-3 py-2 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink"
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <h3 className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
                  {t("sectionCompany")}
                </h3>
                <ul className="mt-2 space-y-1">
                  {[
                    { href: `/${locale}/about`, label: t("about") },
                    { href: `/${locale}/partner`, label: t("partner") },
                    { href: `/${locale}/account`, label: t("account") },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={linkClick}
                        className="flex items-center justify-between rounded-[var(--radius)] px-3 py-2 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink"
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <footer className="space-y-3 border-t border-line p-5">
              <div className="flex items-center justify-between gap-2">
                <LocaleSwitcher currentLocale={locale} />
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  openCart()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                <ShoppingCart className="h-4 w-4" />
                {t("cart")} {count > 0 ? `(${count})` : ""}
              </button>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  )
}
