import { Container } from "@/components/ui/Container"
import { CATEGORIES } from "@/lib/products/categories"
import { ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

/**
 * Category tiles for the home page. Each tile is a link into the filtered
 * catalogue and carries a category-tinted gradient so the grid reads as a
 * navigation surface rather than a wall of identical boxes.
 */
export async function CategoryTiles({ locale }: { locale: string }) {
  const t = await getTranslations("home")
  const c = await getTranslations("store.categories")

  return (
    <section aria-labelledby="categories-title" className="py-12 sm:py-16">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="categories-title"
              className="text-balance font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              {t("categoriesTitle")}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              {t("categoriesSubtitle")}
            </p>
          </div>
          <Link
            href={`/${locale}/shop`}
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent hover:underline underline-offset-4"
          >
            {t("featuredCta")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>

        <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((category) => {
            const Icon = category.icon
            return (
              <li key={category.slug}>
                <Link
                  href={`/${locale}/shop?category=${category.slug}`}
                  style={{ ["--cat-hue" as string]: String(category.hue) }}
                  className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[var(--shadow)]"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(120% 100% at 20% 0%, hsl(${category.hue} 70% 95%) 0%, hsl(${category.hue} 40% 99%) 60%, transparent 100%)`,
                    }}
                  />
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent">
                    <Icon aria-hidden className="h-4.5 w-4.5" />
                  </span>
                  <span className="mt-6 block">
                    <span className="block text-sm font-semibold tracking-tight text-ink">
                      {c(`${category.slug}.name`)}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                      {c(`${category.slug}.description`)}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
