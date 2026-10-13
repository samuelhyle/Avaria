"use client"

/**
 * Derives a ChatContext hint for the AI assistant from the current URL.
 *
 * Keeps the server-side `/api/ai/chat` route stateless — the page simply
 * hands the widget a path-shaped object on mount.
 */

import { useCatalogue } from "@/components/product/CatalogueProvider"
import type { ChatContext } from "@/lib/ai/types"
import { usePathname } from "next/navigation"
import { useMemo } from "react"

export interface PageContextOptions {
  /** Live cart quantity — only used on cart/checkout pages. */
  itemCount?: number
}

export function usePageContext({
  itemCount = 0,
}: PageContextOptions = {}): ChatContext | undefined {
  const products = useCatalogue()
  const pathname = usePathname()

  return useMemo(() => {
    if (!pathname) return undefined
    // Drop the locale segment so the matchers stay locale-agnostic.
    const segments = pathname.split("/").filter(Boolean)
    const rest = `/${segments.slice(1).join("/")}`

    if (rest === "/" || rest === "") return { kind: "home" }

    const productMatch = rest.match(/^\/shop\/([^/]+)$/)
    if (productMatch?.[1]) {
      const slug = productMatch[1]
      const product = products.find((p) => p.slug === slug)
      return { kind: "product", slug, name: product?.defaultTranslation.name ?? slug }
    }

    if (rest === "/shop") return { kind: "shop" }

    const categoryMatch = rest.match(/^\/category\/([^/]+)$/)
    if (categoryMatch?.[1]) return { kind: "category", slug: categoryMatch[1] }

    const blogMatch = rest.match(/^\/blog\/([^/]+)$/)
    if (blogMatch?.[1]) return { kind: "blog", slug: blogMatch[1], title: blogMatch[1] }

    if (rest.startsWith("/checkout")) return { kind: "cart", itemCount }

    if (rest.startsWith("/support") || rest.startsWith("/faq")) return { kind: "support" }

    return { kind: "other", path: pathname }
  }, [pathname, itemCount, products])
}
