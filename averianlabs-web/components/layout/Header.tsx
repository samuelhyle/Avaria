"use client"

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher"
import { Logo } from "@/components/layout/Logo"
import { MegaMenu } from "@/components/layout/MegaMenu"
import { MobileMenu } from "@/components/layout/MobileMenu"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { Container } from "@/components/ui/Container"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import { useCatalogue } from "@/components/product/CatalogueProvider"
import { cn } from "@/lib/utils/cn"
import { useWishlist } from "@/lib/wishlist/store"
import { GitCompare, Heart, Search, ShoppingCart, User } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

interface HeaderProps {
  locale: string
}

export function Header({ locale }: HeaderProps) {
  const products = useCatalogue()
  const t = useTranslations("nav")
  const cartCount = useCart((s) => s.count())
  const openCart = useCart((s) => s.open)
  const wishlistCount = useWishlist((s) => s.items.length)
  const compareCount = useCompare((s) => s.items.length)

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("averianlabs:open-search"))
  }

  // Primary nav (Plan §6): Products · Batch verification · Quality · Support · Company.
  // Secondary resources (calculator, blog, community, glossary, documents, partner)
  // live inside the Mega Menu or the mobile menu — they are reachable but not in
  // the top-level chrome.
  const navItems = [
    { href: `/${locale}/coa`, label: t("coaLibrary") },
    { href: `/${locale}/quality`, label: t("quality") },
    { href: `/${locale}/contact`, label: t("support") },
    { href: `/${locale}/about`, label: t("about") },
  ]

  return (
    <header className="sticky top-0 z-40 glass border-b border-line">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-1.5 focus:text-white"
      >
        {t("skipToContent")}
      </a>

      <Container>
        <div className="flex h-16 min-w-0 items-center gap-2 xl:gap-4">
          <Logo href={`/${locale}`} size="md" glow showWordmark="responsive" className="h-11" />

          <nav className="hidden lg:flex items-center gap-1 text-sm">
            <MegaMenu locale={locale} products={products} />
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-9 items-center rounded-[var(--radius)] px-3 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink",
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
              aria-label={`${t("search")}, open command palette`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius)] border border-line bg-surface text-sm text-ink-subtle transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg xl:w-auto xl:px-3"
            >
              <Search className="h-4 w-4" />
              <span className="hidden xl:inline">{t("search")}</span>
              <span className="hidden xl:inline font-mono text-xs">⌘K</span>
            </button>

            <div className="hidden xl:block"><LocaleSwitcher currentLocale={locale} /></div>
            <div className="hidden xl:block"><ThemeToggle /></div>

            <Link
              href={`/${locale}/account`}
              aria-label={t("account")}
              className="hidden xl:inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <User className="h-4 w-4" />
            </Link>

            <Link
              href={`/${locale}/compare`}
              aria-label={t("compare")}
              className="relative hidden xl:inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <GitCompare className="h-4 w-4" />
              {compareCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-3xs font-semibold text-white">
                  {compareCount}
                </span>
              ) : null}
            </Link>

            <Link
              href={`/${locale}/wishlist`}
              aria-label={t("wishlist")}
              className="relative hidden xl:inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <Heart className="h-4 w-4" />
              {wishlistCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-3xs font-semibold text-white">
                  {wishlistCount}
                </span>
              ) : null}
            </Link>

            <button
              type="button"
              onClick={openCart}
              aria-label={t("cart")}
              className="relative inline-flex h-9 items-center gap-2 rounded-[var(--radius)] bg-surface px-3 text-sm text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("cart")}</span>
              {cartCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-3xs font-semibold text-white">
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
