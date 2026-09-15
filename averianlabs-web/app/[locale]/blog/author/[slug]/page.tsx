import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getAuthorBySlug, listAuthors } from "@/lib/blog/authors"
import { getAuthorPosts } from "@/lib/blog/posts"
import { ArrowLeft, ArrowRight, Calendar, User } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const author = await getAuthorBySlug(slug)
  if (!author) return { title: "Author not found" }
  return {
    title: author.name,
    description: author.bio,
    alternates: { canonical: `/${locale}/blog/author/${slug}` },
  }
}

export async function generateStaticParams() {
  const authors = await listAuthors()
  return authors.flatMap((a) =>
    ["en", "fi", "de", "sv", "nl"].map((locale) => ({ locale, slug: a.slug })),
  )
}

export default async function AuthorPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const author = await getAuthorBySlug(slug)
  if (!author) notFound()
  const t = await getTranslations("nav")

  const posts = await getAuthorPosts(slug).catch(() => [])

  return (
    <Container size="narrow" className="py-16">
      <Link
        href={`/${locale}/blog`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("blog")}
      </Link>

      <header className="mb-10 flex items-start gap-5">
        {author.avatarUrl ? (
          <Image
            src={author.avatarUrl}
            alt=""
            width={80}
            height={80}
            className="h-20 w-20 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-2xl font-semibold text-accent">
            {author.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
        <div>
          <Badge tone="muted" size="sm" className="mb-2">
            <User className="h-3 w-3" />
            {author.role}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {author.name}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-ink-muted">{author.bio}</p>
        </div>
      </header>

      {posts.length === 0 ? (
        <section className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-8 text-center text-sm text-ink-muted">
          <Calendar className="mx-auto mb-2 h-5 w-5 text-ink-subtle" />
          No posts from this author yet. Browse all{" "}
          <Link href={`/${locale}/blog`} className="font-medium text-accent hover:underline">
            research articles
          </Link>
          .
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
            Posts by {author.name}
          </h2>
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/${locale}/blog/${p.slug}`}
              className="group flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-accent-soft/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge tone="muted" size="sm">
                    {p.tag}
                  </Badge>
                  <p className="truncate text-sm font-medium text-ink group-hover:text-accent">
                    {p.title}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {p.publishedAt?.slice(0, 10) ?? ""} · {p.readMin ?? 5} min
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-subtle" />
            </Link>
          ))}
        </section>
      )}
    </Container>
  )
}
