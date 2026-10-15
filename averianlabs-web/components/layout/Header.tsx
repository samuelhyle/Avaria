"use client"

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher"
import { Logo } from "@/components/layout/Logo"
import { MegaMenu } from "@/components/layout/MegaMenu"
import { MobileMenu } from "@/components/layout/MobileMenu"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { useCatalogue } from "@/components/product/CatalogueProvider"
import { Container } from "@/components/ui/Container"
import { useCart } from "@/lib/cart/store"
import { cn } from "@/lib/utils/cn"
import { Search, ShoppingCart, User } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface HeaderProps {
  locale: string
}

export function Header({ locale }: HeaderProps) {
  const products = useCatalogue()
  const pathname = usePathname()
  const e = useTranslations("experience")
  const t = useTranslations("nav")
  const r = useTranslations("research")
  const cartCount = useCart((s) => s.items.reduce((count, item) => count + item.qty, 0))
  const openCart = useCart((s) => s.open)

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("averianlabs:open-search"))
  }

  // Primary nav (Plan §6): Products · Batch verification · Quality · Support · Company.
  // Secondary resources (calculator, blog, community, glossary, documents, partner)
  // live inside the Mega Menu or the mobile menu — they are reachable but not in
  // the top-level chrome.
  const navItems = [
    { href: `/${locale}/documents`, label: e("documents") },
    { href: `/${locale}/research-tools`, label: r("tools") },
    { href: `/${locale}/community`, label: t("community") },
    { href: `/${locale}/contact`, label: t("support") },
  ]

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-line">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-1.5 focus:text-white"
      >
        {t("skipToContent")}
      </a>

      <Container>
        <div className="flex h-16 min-w-0 items-center gap-2 xl:gap-4">
          <Logo href={`/${locale}`} size="md" showWordmark className="h-11" />

          <nav className="hidden xl:flex items-center gap-1 text-sm">
            <MegaMenu locale={locale} products={products} />
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  pathname?.startsWith(item.href) ||
                  (item.href.endsWith("/documents") && pathname?.startsWith(`/${locale}/coa`)) ||
                  (item.href.endsWith("/research-tools") &&
                    /\/(assistant|peptide-calculator)(?:\/|$)/.test(pathname ?? ""))
                    ? "page"
                    : undefined
                }
                className={cn(
                  "relative inline-flex h-9 items-center rounded-[var(--radius)] px-3 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink",
                  "aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent aria-[current=page]:font-semibold before:absolute before:inset-x-3 before:bottom-1 before:h-px before:origin-left before:scale-x-0 before:bg-accent before:transition-transform before:duration-300 before:ease-[var(--ease-crystal)] before:content-[''] hover:before:scale-x-100",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={openSearch}
              aria-label={t("search")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius)] border border-line bg-surface text-sm text-ink-subtle transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg xl:w-auto xl:px-3"
            >
              <Search className="h-4 w-4" />
              <span className="hidden xl:inline">{t("search")}</span>
              <span className="hidden xl:inline font-mono text-xs">⌘K</span>
            </button>

            <div className="hidden xl:block">
              <LocaleSwitcher currentLocale={locale} />
            </div>
            <div className="hidden xl:block">
              <ThemeToggle />
            </div>

            <Link
              href={`/${locale}/account`}
              aria-label={t("account")}
              className="hidden xl:inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <User className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={openCart}
              aria-label={t("cart")}
              className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius)] bg-surface text-sm text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg xl:w-auto xl:px-3"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
              <span className="hidden xl:inline">{t("cart")}</span>
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-white xl:static">
                  {cartCount}
                </span>
              ) : null}
              <span className="sr-only" aria-live="polite" aria-atomic="true">
                {cartCount > 0 ? t("cartCount", { count: cartCount }) : ""}
              </span>
            </button>

            <MobileMenu locale={locale} productsCount={products.length} />
          </div>
        </div>
      </Container>
    </header>
  )
}
