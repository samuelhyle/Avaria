"use client"
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher"
import { Logo } from "@/components/layout/Logo"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { useCart } from "@/lib/cart/store"
import { useOverlay } from "@/lib/hooks/use-overlay"
import { CATEGORIES } from "@/lib/products/categories"
import { requestSearchPalette } from "@/lib/search/palette"
import { ChevronDown, ChevronRight, Menu, Search, ShoppingCart, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
export function MobileMenu({ locale, productsCount }: { locale: string; productsCount: number }) {
  const t = useTranslations("nav")
  const r = useTranslations("research")
  const e = useTranslations("experience")
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const count = useCart((s) => s.items.reduce((count, item) => count + item.qty, 0))
  const openCart = useCart((s) => s.open)
  const close = () => setOpen(false)
  const ref = useOverlay({ open, onClose: close })
  const search = () => {
    close()
    requestSearchPalette()
  }
  const primary = [
    { path: "shop", label: t("allProducts") },
    { path: "documents", label: e("documents") },
    { path: "research-tools", label: r("tools") },
    { path: "community", label: t("community") },
    { path: "contact", label: t("support") },
  ]
  const resources = [
    { path: "lab-tests", label: r("methodology") },
    { path: "quality", label: t("quality") },
    { path: "blog", label: t("blog") },
    { path: "glossary", label: t("glossary") },
    { path: "about", label: t("about") },
    { path: "partner", label: t("partner") },
    { path: "account", label: t("account") },
    { path: "wishlist", label: t("wishlist") },
    { path: "compare", label: t("compare") },
  ]
  const item = (link: { path: string; label: string }) => (
    <Link
      href={`/${locale}/${link.path}`}
      onClick={close}
      aria-current={pathname === `/${locale}/${link.path}` ? "page" : undefined}
      className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 text-sm text-ink-muted hover:bg-surface-2 aria-[current=page]:bg-accent-soft aria-[current=page]:font-semibold aria-[current=page]:text-accent"
    >
      <span>{link.label}</span>
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0" />
    </Link>
  )
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-2 xl:hidden"
      >
        <Menu aria-hidden className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label={t("close")}
            onClick={close}
            className="absolute inset-0 bg-ink/40"
          />
          <aside
            ref={ref}
            id="mobile-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("openMenu")}
            className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-sm flex-col bg-surface shadow-xl"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <Logo href={`/${locale}`} size="sm" onClick={close} />
              <button
                type="button"
                onClick={close}
                aria-label={t("close")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-surface-2"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <button
                type="button"
                onClick={search}
                className="mb-4 flex min-h-12 w-full items-center gap-3 rounded-lg border border-line px-3 text-sm text-ink-muted"
              >
                <Search aria-hidden className="h-4 w-4" />
                {t("search")}
              </button>
              <nav aria-label={t("openMenu")}>
                <ul>
                  {primary.map((link) => (
                    <li key={link.path}>{item(link)}</li>
                  ))}
                </ul>
                <div className="my-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/${locale}/peptide-calculator`}
                    onClick={close}
                    className="flex min-h-11 items-center justify-center rounded-lg border border-line px-3 text-sm font-medium text-accent"
                  >
                    {t("calculator")}
                  </Link>
                  <Link
                    href={`/${locale}/assistant`}
                    onClick={close}
                    className="flex min-h-11 items-center justify-center rounded-lg border border-line px-3 text-sm font-medium text-accent"
                  >
                    Averia
                  </Link>
                </div>
                <details className="group border-t border-line">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    {t("sectionShop")} · {productsCount}
                    <ChevronDown
                      aria-hidden
                      className="h-4 w-4 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <ul className="pb-3">
                    {CATEGORIES.map(({ slug }) => (
                      <li key={slug}>
                        <Link
                          href={`/${locale}/shop?category=${slug}`}
                          onClick={close}
                          className="flex min-h-11 items-center rounded-lg px-3 text-sm text-ink-muted hover:bg-surface-2"
                        >
                          {r(`categories.${slug}`)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
                <details className="group border-t border-line">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    {t("sectionResearch")}
                    <ChevronDown
                      aria-hidden
                      className="h-4 w-4 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <ul>
                    {resources.map((link) => (
                      <li key={link.path}>{item(link)}</li>
                    ))}
                  </ul>
                </details>
              </nav>
            </div>
            <footer className="platform-bottom-safe space-y-3 border-t border-line p-4">
              <div className="flex items-center justify-between gap-3">
                <LocaleSwitcher currentLocale={locale} />
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => {
                  close()
                  openCart()
                }}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-on-accent"
              >
                <ShoppingCart aria-hidden className="h-4 w-4" />
                {t("cart")}
                {count > 0 && ` (${count})`}
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  )
}
