import { ThreadListItem } from "@/components/community/ThreadListItem"
import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Container"
import { getCategoryBySlug, listThreads } from "@/lib/community"
import { Plus } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"
export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string; category: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params
  return {
    title: `Category · ${category}`,
    alternates: { canonical: `/${locale}/community/${category}` },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params
  setRequestLocale(locale)

  const cat = await getCategoryBySlug(category)
  if (!cat) notFound()
  const threads = await listThreads({ categoryId: cat.id, limit: 30 })
  const t = await getTranslations("community")
  const catName = t(`categories.${resolveCategoryKey(cat.nameKey)}.name` as never)
  const catDesc = t(`categories.${resolveCategoryKey(cat.nameKey)}.description` as never)

  return (
    <Container className="py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs uppercase tracking-wider text-ink-subtle">{t("title")}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">{catName}</h1>
          <p className="mt-2 text-base text-ink-muted">{catDesc}</p>
        </div>
        <Button asChild size="sm">
          <Link href={`/${locale}/community/new`}>
            <Plus className="h-4 w-4" />
            {t("newThread")}
          </Link>
        </Button>
      </header>

      <h2 className="mb-3 text-sm font-medium text-ink-muted">{t("categoryHeading")}</h2>
      {threads.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-sm text-ink-muted">{t("emptyThreads")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map(
            (th: {
              id: string
              slug: string
              title: string
              categorySlug: string | null
              replyCount: number
              viewCount: number
              lastActivityAt: Date
              authorName: string | null
              authorReputation: number | null
            }) => (
              <ThreadListItem
                key={th.id}
                locale={locale}
                thread={{
                  id: th.id,
                  slug: th.slug,
                  title: th.title,
                  categorySlug: th.categorySlug ?? "",
                  replyCount: th.replyCount,
                  viewCount: th.viewCount,
                  lastActivityAt: th.lastActivityAt,
                  authorName: th.authorName ?? "Anonymous",
                  authorReputation: th.authorReputation ?? 0,
                }}
              />
            ),
          )}
        </div>
      )}
    </Container>
  )
}

function resolveCategoryKey(nameKey: string): string {
  const parts = nameKey.split(".")
  return parts[parts.length - 2] ?? ""
}
