import { WishlistView } from "@/components/product/WishlistView"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { ShareButton } from "@/components/ui/ShareButton"
import { products } from "@/lib/products/data"
import { makePageMetadata } from "@/lib/seo/metadata"
import { Heart } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

export const generateMetadata = makePageMetadata("wishlist", "/wishlist")

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const _t = await getTranslations({ locale, namespace: "common" })

  return (
    <Container className="py-12">
      <header className="mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <Heart className="h-5 w-5" />
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">Wishlist</h1>
            <p className="mt-2 text-ink-muted">
              Your saved peptides — pick up where you left off, or share with a colleague.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton />
          </div>
        </div>
      </header>

      <WishlistView locale={locale} />

      <section className="mt-16 rounded-[var(--radius-lg)] border border-line bg-surface-2/40 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge tone="accent" className="mb-2">
              Popular with researchers like you
            </Badge>
            <h2 className="font-display text-xl font-semibold">Best sellers</h2>
            <p className="mt-1 text-sm text-ink-muted">Top-voted peptides this month.</p>
          </div>
          <Link
            href={`/${locale}/shop`}
            className="text-sm font-medium text-accent hover:underline"
          >
            View all {products.length} products →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((p) => (
            <Link
              key={p.slug}
              href={`/${locale}/shop/${p.slug}`}
              className="group flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-3 transition-colors hover:border-accent/40"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{
                  background: `linear-gradient(135deg, hsl(${p.hue} 70% 95%), hsl(${p.hue} 70% 75%))`,
                }}
              >
                <span
                  className="font-mono text-3xs font-semibold"
                  style={{ color: `hsl(${p.hue} 70% 30%)` }}
                >
                  {p.vials[0]?.mg}mg
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{p.defaultTranslation.name}</p>
                <p className="font-mono text-3xs text-ink-subtle">{p.vials[0]?.sku}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Container>
  )
}
