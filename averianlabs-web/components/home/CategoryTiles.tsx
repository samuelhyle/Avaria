import { Section } from "@/components/ui/Section"
import { SectionHeader } from "@/components/ui/SectionHeader"
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
    <Section aria-labelledby="categories-title">
      <SectionHeader
        title={t("categoriesTitle")}
        titleId="categories-title"
        subtitle={t("categoriesSubtitle")}
        action={
          <Link
            href={`/${locale}/shop`}
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent hover:underline underline-offset-4"
          >
            {t("featuredCta")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        }
      />

      {/* Seven tiles in four columns left an empty corner that read as a
          missing tile. A flex wrap centres the last row instead. */}
      <ul className="mt-8 flex flex-wrap justify-center gap-3">
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <li
              key={category.slug}
              className="w-[calc(50%-0.375rem)] sm:w-[calc(33.3333%-0.5rem)] lg:w-[calc(25%-0.5625rem)]"
            >
              <Link
                href={`/${locale}/shop?category=${category.slug}`}
                style={{ ["--cat-hue" as string]: String(category.hue) }}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface p-4 transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-crystal)] hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[var(--shadow)]"
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
    </Section>
  )
}
