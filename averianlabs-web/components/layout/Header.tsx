"use client"

import { MiniCartPopover } from "@/components/cart/MiniCartPopover"
import { AnnouncementBar } from "@/components/layout/AnnouncementBar"
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher"
import { Logo } from "@/components/layout/Logo"
import { MegaMenu } from "@/components/layout/MegaMenu"
import { MobileMenu } from "@/components/layout/MobileMenu"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { useCatalogue } from "@/components/product/CatalogueProvider"
import { Container } from "@/components/ui/Container"
import { ShortcutHint } from "@/components/ui/ShortcutHint"
import { useCart } from "@/lib/cart/store"
import type { Locale as ProductLocale } from "@/lib/products/types"
import { registerSearchShortcut, requestSearchPalette } from "@/lib/search/palette"
import { cn } from "@/lib/utils/cn"
import { Search, ShoppingCart, User } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

interface HeaderProps {
  locale: string
}

export function Header({ locale }: HeaderProps) {
  const products = useCatalogue()
  const pathname = usePathname()
  const e = useTranslations("experience")
  const t = useTranslations("nav")
  const cartCount = useCart((s) => s.items.reduce((count, item) => count + item.qty, 0))
  const openCart = useCart((s) => s.open)
  const cartBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => registerSearchShortcut(document), [])

  // The shop is the front door. Everything else lives one level deeper so the
  // storefront still reads as a store and not as a research workspace.
  const researchLinks = [
    { href: `/${locale}/certificates`, label: t("certificates") },
    { href: `/${locale}/documents`, label: e("documents") },
    { href: `/${locale}/research-tools`, label: t("research") },
    { href: `/${locale}/community`, label: t("community") },
    { href: `/${locale}/contact`, label: t("support") },
  ]

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-1.5 focus:text-white"
        >
          {t("skipToContent")}
        </a>

        <Container>
          <div className="flex h-16 min-w-0 items-center gap-2 xl:gap-4">
            <Logo href={`/${locale}`} size="md" showWordmark className="h-11" />

            <nav
              aria-label={t("sectionShop")}
              className="hidden min-w-0 items-center gap-1 text-sm xl:flex"
            >
              <MegaMenu locale={locale} products={products} />
              <span aria-hidden className="mx-2 h-5 w-px bg-line" />
              {researchLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={
                    pathname?.startsWith(item.href) ||
                    (item.href.endsWith("/documents") && pathname?.startsWith(`/${locale}/coa`)) ||
                    (item.href.endsWith("/certificates") &&
                      pathname?.startsWith(`/${locale}/coa`)) ||
                    (item.href.endsWith("/research-tools") &&
                      /\/(assistant|peptide-calculator)(?:\/|$)/.test(pathname ?? ""))
                      ? "page"
                      : undefined
                  }
                  className={cn(
                    "relative inline-flex h-9 items-center whitespace-nowrap rounded-[var(--radius)] px-3 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink",
                    "aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent aria-[current=page]:font-semibold",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={requestSearchPalette}
                aria-label={t("search")}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius)] border border-line bg-surface text-sm text-ink-subtle transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg xl:w-auto xl:px-3"
              >
                <Search className="h-4 w-4" />
                <span className="hidden xl:inline">{t("search")}</span>
                <ShortcutHint className="hidden xl:inline font-mono text-xs" />
              </button>

              <div className="hidden xl:block">
                <LocaleSwitcher currentLocale={locale} />
              </div>
              <div className="hidden xl:block">
                <ThemeToggle />
              </div>

              <div className="hidden xl:block">
                <NotificationBell locale={locale} />
              </div>

              <Link
                href={`/${locale}/account`}
                aria-label={t("account")}
                className="hidden xl:inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <User className="h-4 w-4" />
              </Link>

              <div className="relative">
                <button
                  ref={cartBtnRef}
                  type="button"
                  onClick={openCart}
                  aria-label={t("cart")}
                  aria-haspopup="dialog"
                  className="relative inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg xl:w-auto xl:px-4"
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                  <span className="hidden xl:inline">{t("cart")}</span>
                  {cartCount > 0 ? (
                    <span
                      // The key changes with the count, so the badge is
                      // remounted and the acknowledgement runs again.
                      key={cartCount}
                      className="store-bump absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-xs font-semibold text-white xl:static xl:bg-white/20 xl:text-on-accent"
                    >
                      {cartCount}
                    </span>
                  ) : null}
                  <span className="sr-only" aria-live="polite" aria-atomic="true">
                    {cartCount > 0 ? t("cartCount", { count: cartCount }) : ""}
                  </span>
                </button>
                <MiniCartPopover
                  anchorRef={cartBtnRef as unknown as React.RefObject<HTMLElement>}
                  locale={locale as ProductLocale}
                />
              </div>

              <MobileMenu locale={locale} productsCount={products.length} />
            </div>
          </div>
        </Container>
      </header>
    </>
  )
}
