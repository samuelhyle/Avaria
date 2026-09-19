"use client"

import { StickyMobileAtc } from "@/components/product/StickyMobileAtc"
import { SaveToPlanWrapper } from "@/components/research-plans/SaveToPlanWrapper"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useCart } from "@/lib/cart/store"
import type { Locale, Product } from "@/lib/products/types"
import { isContactOnly } from "@/lib/products/vials"
import { cn } from "@/lib/utils/cn"
import { formatCurrency } from "@/lib/utils/format"
import { Calculator, Check, Mail, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface ProductDetailActionsProps {
  product: Product
  locale: Locale | string
}

interface PlanSummary {
  id: string
  title: string
}

// Threshold (in cents) for free EU-wide shipping, formatted with active locale.
const FREE_SHIPPING_THRESHOLD_CENTS = 15000

export function ProductDetailActions({ product, locale }: ProductDetailActionsProps) {
  const t = useTranslations("product")
  const tCommon = useTranslations("common")
  const translation = product.translations?.[locale as Locale] ?? product.defaultTranslation
  const [vialIdx, setVialIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const add = useCart((s) => s.add)

  // Resolve the session + saved plans after hydration so the product page can
  // be statically rendered (previously `auth()` forced it dynamic).
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const sessionRes = await fetch("/api/auth/session")
        const session = sessionRes.ok ? await sessionRes.json() : null
        if (cancelled) return
        const authed = Boolean(session?.user?.id)
        setIsAuthed(authed)
        if (!authed) return

        const plansRes = await fetch("/api/plans")
        if (!plansRes.ok) return
        const data = (await plansRes.json()) as { plans?: PlanSummary[] }
        if (cancelled) return
        setPlans(
          (data.plans ?? []).map((p) => ({
            id: p.id,
            title: p.title,
          })),
        )
      } catch {
        if (!cancelled) setIsAuthed(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const vial = product.vials[vialIdx]
  if (!vial) return null
  const isContact = isContactOnly(vial)
  const disabled = !isContact && vial.stockQty === 0

  if (isContact) {
    return (
      <div className="mt-8 rounded-[var(--radius-lg)] border border-line bg-surface-2 p-6">
        <h3 className="font-display text-lg font-semibold">{t("quoteTitle")}</h3>
        <p className="mt-1 text-sm text-ink-muted">{t("quoteSubtitle")}</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            toast.success(t("quoteSent"), {
              description: t("quoteSentDesc", { name: translation.name }),
            })
          }}
        >
          <Input type="email" placeholder={t("quoteEmailPlaceholder")} required />
          <Button type="submit" size="lg" fullWidth>
            <Mail className="h-4 w-4" />
            {t("requestQuote")}
          </Button>
        </form>
      </div>
    )
  }

  const handleAdd = () => {
    add({
      productSlug: product.slug,
      sku: vial.sku,
      name: `${translation.name} ${vial.mg}mg`,
      mg: vial.mg,
      qty,
      unitPriceCents: vial.priceCents,
    })
    toast.success(t("addedToCart"), {
      description: t("addedToCartDesc", { name: translation.name, mg: vial.mg, qty }),
    })
  }

  return (
    <>
      <div className="mt-8 space-y-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            {t("selectVialSize")}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {product.vials.map((v, i) => (
              <button
                key={v.sku}
                type="button"
                onClick={() => {
                  setVialIdx(i)
                  setQty(1)
                }}
                disabled={v.stockQty === 0}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-[var(--radius)] border p-3 text-left transition-colors",
                  vialIdx === i
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:border-accent/40",
                  v.stockQty === 0 && "opacity-50",
                )}
              >
                <span className="font-display text-lg font-semibold">{v.mg} mg</span>
                <span className="font-mono text-3xs text-ink-subtle">{v.sku}</span>
                <span className="font-display text-sm">
                  {formatCurrency(v.priceCents, "EUR", locale)}
                </span>
                {v.compareAtCents ? <Badge tone="warn">{t("sale")}</Badge> : null}
              </button>
            ))}
          </div>
          <Link
            href={`/${locale}/peptide-calculator?calc=${encodeURIComponent(
              JSON.stringify({
                v: 1,
                tab: "reconstitution",
                vialMg: vial.mg,
                solventMl: vial.mg <= 10 ? 2 : 3,
                doseMcg: vial.mg <= 10 ? 250 : 2500,
                productSlug: product.slug,
              }),
            ).replace(/"/g, "")}`}
            className="mt-3 inline-flex items-center gap-1.5 text-2xs text-accent hover:text-accent-hover"
          >
            <Calculator className="h-3.5 w-3.5" />
            {t("openCalculator", { defaultValue: "Calculate reconstitution for this vial" })}
          </Link>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            {t("quantity")}
          </h3>
          <div className="mt-3 inline-flex items-center rounded-[var(--radius)] border border-line bg-surface">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="inline-flex h-10 w-10 items-center justify-center text-ink-muted hover:text-ink"
              aria-label={tCommon("decreaseQuantity")}
            >
              −
            </button>
            <span className="w-12 text-center font-mono">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(vial.stockQty, q + 1))}
              className="inline-flex h-10 w-10 items-center justify-center text-ink-muted hover:text-ink"
              aria-label={tCommon("increaseQuantity")}
            >
              +
            </button>
          </div>
        </div>

        <Button size="lg" fullWidth disabled={disabled} onClick={handleAdd}>
          {disabled ? (
            <Badge tone="danger">{t("outOfStock")}</Badge>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              {t("addToCartWithPrice", {
                price: formatCurrency(vial.priceCents * qty, "EUR", locale),
              })}
            </>
          )}
        </Button>

        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Check className="h-3 w-3 text-success" />
          <span>
            {t("freeShippingOver", {
              amount: formatCurrency(FREE_SHIPPING_THRESHOLD_CENTS, "EUR", locale),
            })}
          </span>
        </div>

        {isAuthed !== null ? (
          <SaveToPlanWrapper
            productSlug={product.slug}
            productName={translation.name}
            locale={String(locale)}
            isAuthed={isAuthed}
            plans={plans}
          />
        ) : null}
      </div>

      <StickyMobileAtc
        product={product}
        locale={String(locale)}
        onAddToCart={handleAdd}
        disabled={disabled}
        priceCents={vial.priceCents * qty}
        vialLabel={`${vial.mg} mg · ${vial.sku}`}
      />
    </>
  )
}
