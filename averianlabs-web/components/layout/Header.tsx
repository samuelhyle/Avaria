"use client"

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher"
import { Logo } from "@/components/layout/Logo"
import { MegaMenu } from "@/components/layout/MegaMenu"
import { MobileMenu } from "@/components/layout/MobileMenu"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { Container } from "@/components/ui/Container"
import { useCart } from "@/lib/cart/store"
import { useCompare } from "@/lib/compare/store"
import { products } from "@/lib/products/data"
import { cn } from "@/lib/utils/cn"
import { useWishlist } from "@/lib/wishlist/store"
import {
  Clock,
  FlaskConical,
  GitCompare,
  Globe,
  Heart,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

interface HeaderProps {
  locale: string
}

export function Header({ locale }: HeaderProps) {
  const t = useTranslations("nav")
  const cartCount = useCart((s) => s.count())
  const openCart = useCart((s) => s.open)
  const wishlistCount = useWishlist((s) => s.items.length)
  const compareCount = useCompare((s) => s.items.length)

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("averianlabs:open-search"))
  }

  const navItems = [
    { href: `/${locale}/shop`, label: t("shop") },
    { href: `/${locale}/lab-tests`, label: t("labTests") },
    { href: `/${locale}/peptide-calculator`, label: t("calculator") },
    { href: `/${locale}/community`, label: t("community") },
    { href: `/${locale}/blog`, label: t("blog") },
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

      <div className="border-b border-line/60 bg-accent-soft/60">
        <Container>
          <div className="flex h-8 items-center justify-center gap-3 text-2xs font-medium text-accent-ink">
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <Globe className="h-3 w-3" aria-hidden />
              {t("topbar.euDispatched")}
            </span>
            <span className="mx-1 hidden sm:inline opacity-30" aria-hidden>
              ·
            </span>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <FlaskConical className="h-3 w-3" aria-hidden />
              {t("topbar.hplcVerified")}
            </span>
            <span className="mx-1 hidden md:inline opacity-30" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-3 w-3" aria-hidden />
              {t("topbar.freeShipping")}
            </span>
            <span className="mx-1 hidden lg:inline opacity-30" aria-hidden>
              ·
            </span>
            <span className="hidden items-center gap-1.5 lg:inline-flex">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              {t("topbar.coaEveryBatch")}
            </span>
            <span className="mx-1 hidden xl:inline opacity-30" aria-hidden>
              ·
            </span>
            <span className="hidden items-center gap-1.5 xl:inline-flex">
              <Clock className="h-3 w-3" aria-hidden />
              {t("topbar.dispatch24h")}
            </span>
          </div>
        </Container>
      </div>

      <Container>
        <div className="flex h-16 items-center gap-6">
          <Logo href={`/${locale}`} size="md" glow showWordmark="responsive" className="h-11" />

          <nav className="hidden lg:flex items-center gap-1 text-sm">
            <MegaMenu locale={locale} products={products} />
            {navItems.slice(1).map((item) => (
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
              aria-label={t("search")}
              className="hidden md:inline-flex h-9 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 text-sm text-ink-subtle transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <Search className="h-4 w-4" />
              <span>{t("search")}</span>
              <span className="font-mono text-xs">⌘K</span>
            </button>

            <LocaleSwitcher currentLocale={locale} />

            <ThemeToggle />

            <Link
              href={`/${locale}/account`}
              aria-label={t("account")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <User className="h-4 w-4" />
            </Link>

            <Link
              href={`/${locale}/compare`}
              aria-label={t("compare")}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <GitCompare className="h-4 w-4" />
              {compareCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-3xs font-semibold text-white">
                  {compareCount}
                </span>
              ) : null}
            </Link>

            <Link
              href={`/${locale}/wishlist`}
              aria-label={t("wishlist")}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <Heart className="h-4 w-4" />
              {wishlistCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-3xs font-semibold text-white">
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
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-3xs font-semibold text-white">
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
