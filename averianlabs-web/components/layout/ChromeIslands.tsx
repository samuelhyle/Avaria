"use client"

import { CompareFloatingBar } from "@/components/compare/CompareFloatingBar"
import { CompareModal } from "@/components/compare/CompareModal"
import { useCatalogue } from "@/components/product/CatalogueProvider"
import dynamic from "next/dynamic"

// Every interactive shell element lives here as a lazy, ssr:false island so
// none of them block hydration or inflate the SSR HTML.

const AgeGate = dynamic(() => import("@/components/layout/AgeGate").then((m) => m.AgeGate), {
  ssr: false,
  loading: () => null,
})
const CookieBanner = dynamic(
  () => import("@/components/layout/CookieBanner").then((m) => m.CookieBanner),
  { ssr: false, loading: () => null },
)
const CartDrawer = dynamic(() => import("@/components/cart/CartDrawer").then((m) => m.CartDrawer), {
  ssr: false,
  loading: () => null,
})
const CartHydration = dynamic(
  () => import("@/components/cart/CartHydration").then((m) => m.CartHydration),
  { ssr: false, loading: () => null },
)
const CommandPalette = dynamic(
  () => import("@/components/search/CommandPalette").then((m) => m.CommandPalette),
  { ssr: false, loading: () => null },
)
const BackToTop = dynamic(() => import("@/components/ui/BackToTop").then((m) => m.BackToTop), {
  ssr: false,
  loading: () => null,
})

export function ChromeIslands({ locale }: { locale: string }) {
  const products = useCatalogue()
  return (
    <>
      <AgeGate />
      <CookieBanner locale={locale} />
      <CartDrawer locale={locale} />
      <CartHydration />
      <CommandPalette locale={locale} products={products} />
      <BackToTop />
      <CompareFloatingBar locale={locale} />
      <CompareModal locale={locale as import("@/lib/products/types").Locale} products={products} />
    </>
  )
}
