"use client"

import { CATEGORIES } from "@/lib/products/categories"
import type { Locale, Product } from "@/lib/products/types"
import { findCheapestVial, isContactOnly } from "@/lib/products/vials"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"
import { ArrowRight, ChevronDown, FlaskConical } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { type CSSProperties, useRef, useState } from "react"

interface MegaMenuProps {
  locale: Locale | string
  products: Product[]
}

export function MegaMenu({ locale, products }: MegaMenuProps) {
  const t = useTranslations("nav")
  const tShop = useTranslations("shop")
  const tHome = useTranslations("home")
  const tCommon = useTranslations("common")
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = () => setOpenSlug(null)

  return (
    <nav
      className="hidden lg:flex items-center gap-1 text-sm"
      onMouseLeave={close}
      aria-label={t("shop")}
    >
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={() => setOpenSlug("shop")}
        onKeyDown={(e) => {
          if (e.key === "Escape" && openSlug === "shop") {
            close()
            triggerRef.current?.focus()
            return
          }
          // Open with ArrowDown / ArrowUp / Enter when trigger is focused
          if (openSlug !== "shop") {
            if (
              (e.key === "ArrowDown" ||
                e.key === "ArrowUp" ||
                e.key === "Enter" ||
                e.key === " ") &&
              document.activeElement === triggerRef.current
            ) {
              e.preventDefault()
              setOpenSlug("shop")
              // Focus the first menu item on next tick
              requestAnimationFrame(() => {
                const first = containerRef.current?.querySelector<HTMLElement>(
                  "#mega-shop-panel a[href]",
                )
                first?.focus()
              })
            }
            return
          }
          // Roving within the panel
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault()
            const items = Array.from(
              containerRef.current?.querySelectorAll<HTMLElement>("#mega-shop-panel a[href]") ?? [],
            )
            if (items.length === 0) return
            const currentIndex = items.findIndex((el) => el === document.activeElement)
            const dir = e.key === "ArrowDown" ? 1 : -1
            const nextIndex =
              currentIndex < 0 ? 0 : (currentIndex + dir + items.length) % items.length
            items[nextIndex]?.focus()
          }
          if (e.key === "Tab") {
            close()
          }
        }}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null
          if (!containerRef.current?.contains(next)) close()
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={openSlug === "shop"}
          aria-haspopup="true"
          aria-controls="mega-shop-panel"
          onClick={() => setOpenSlug((s) => (s === "shop" ? null : "shop"))}
          className={cn(
            "flex items-center gap-1 rounded-[var(--radius)] px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            openSlug === "shop"
              ? "bg-surface-2 text-ink"
              : "text-ink-muted hover:bg-surface-2 hover:text-ink",
          )}
        >
          {t("shop")}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", openSlug === "shop" && "rotate-180")}
            aria-hidden
          />
        </button>

        {openSlug === "shop" ? (
          <div
            id="mega-shop-panel"
            className="absolute left-0 top-full z-50 mt-1 w-[760px] rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-xl"
          >
            <div className="grid gap-6 sm:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
                  {tShop("browseByCategory")}
                </p>
                <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                  {CATEGORIES.map(({ slug, key, icon: Icon, hue }) => (
                    <li key={slug}>
                      <Link
                        href={`/${locale}/shop?category=${slug}`}
                        className="group flex items-center gap-3 rounded-[var(--radius)] p-2 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <div
                          className="hue-chip flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]"
                          style={{ "--cat-hue": hue } as CSSProperties}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {tHome(`cat${key.charAt(0).toUpperCase() + key.slice(1)}` as never)}
                          </p>
                          <p className="text-3xs text-ink-subtle">
                            {tShop("productsCount", {
                              count: products.filter((p) => p.category === slug).length,
                            })}
                          </p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-ink-subtle opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-3xs font-semibold uppercase tracking-wider text-ink-subtle">
                  {tShop("featured")}
                </p>
                <ul className="mt-3 space-y-1">
                  {products.slice(0, 4).map((p) => {
                    const translation = p.translations?.[locale as Locale] ?? p.defaultTranslation
                    const minVial = findCheapestVial(p)
                    if (!minVial) return null
                    return (
                      <li key={p.slug}>
                        <Link
                          href={`/${locale}/shop/${p.slug}`}
                          className="group flex items-center gap-3 rounded-[var(--radius)] p-2 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <div
                            className="hue-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                            style={{ "--cat-hue": p.hue } as CSSProperties}
                          >
                            <FlaskConical className="h-4 w-4 text-ink-muted" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{translation.name}</p>
                            <p className="font-mono text-3xs text-ink-subtle">{minVial.sku}</p>
                          </div>
                          <span className="text-xs font-medium text-ink-muted">
                            {isContactOnly(minVial)
                              ? tCommon("quote")
                              : formatCurrency(minVial.priceCents, "EUR", locale)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
                <Link
                  href={`/${locale}/shop`}
                  className="mt-4 flex items-center gap-1 rounded-[var(--radius)] border border-line bg-surface-2 p-2.5 text-xs font-medium text-accent hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {tShop("viewAllProducts", { count: products.length })}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
