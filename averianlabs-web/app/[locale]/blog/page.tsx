import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { listPosts } from "@/lib/blog/posts"
import { ArrowRight, Calendar } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"

interface IndexPost {
  slug: string
  title: string
  excerpt: string
  date: string
  readMin: number
  tag: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "home" })
  return {
    title: t("blogHeading"),
    alternates: { canonical: `/${locale}/blog` },
  }
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: "home" })

  // Prefer Sanity. Empty array means no posts / not configured → fall back.
  const r = await getTranslations("research")
  const sanity = await listPosts(locale).catch(() => [])
  const posts: IndexPost[] =
    sanity.length > 0
      ? sanity.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          date: p.publishedAt?.slice(0, 10) ?? "",
          readMin: p.readMin ?? 5,
          tag: p.tag,
        }))
      : []

  return (
    <Container className="py-16">
      <header className="mb-12 max-w-2xl">
        <Badge tone="accent" className="mb-4">
          {r("blog")}
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("blogHeading")}
        </h1>
        <p className="mt-3 text-ink-muted">{r("aboutEvidenceBody")}</p>
      </header>

      {posts.length === 0 && <p className="text-ink-muted">{r("articlesEmpty")}</p>}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/${locale}/blog/${post.slug}`}
            className="group flex flex-col rounded-[var(--radius-lg)] border border-line bg-surface p-6 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-accent/40"
          >
            <Badge tone="muted" className="self-start">
              {post.tag}
            </Badge>
            <h2 className="mt-4 font-display text-xl font-semibold leading-snug text-ink text-balance group-hover:text-accent">
              {post.title}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm text-ink-muted text-pretty">{post.excerpt}</p>
            <div className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-subtle">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {post.date}
              </span>
              <span className="flex items-center gap-1">
                {r("readMinutes", { count: post.readMin })} <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Container>
  )
}
