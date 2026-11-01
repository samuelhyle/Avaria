import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getAuthorBySlug } from "@/lib/blog/authors"
import { getPostBySlug, listAllPostSlugs, listPosts } from "@/lib/blog/posts"
import { annotateWithGlossary, listGlossaryTerms } from "@/lib/glossary"
import { getStorefrontCatalogue } from "@/lib/products/catalogue"
import { ArrowLeft, Calendar, ChevronRight, Clock, User } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

export async function generateStaticParams() {
  const sanitySlugs = await listAllPostSlugs()
  const fallbackSlugs: string[] = []
  const slugs = Array.from(new Set([...sanitySlugs, ...fallbackSlugs]))
  return slugs.flatMap((slug) => ["en", "fi", "sv", "ru"].map((locale) => ({ locale, slug })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const sanityPost = await getPostBySlug(slug, locale).catch(() => null)
  const title = sanityPost?.title ?? slug
  const excerpt = sanityPost?.excerpt ?? ""
  return {
    title,
    description: excerpt,
    alternates: { canonical: `/${locale}/blog/${slug}` },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  // Try Sanity first, then fall back to the hardcoded map.
  const sanityPost = await getPostBySlug(slug, locale).catch(() => null)

  if (!sanityPost) notFound()

  // Build a unified view the renderer can use.
  const view = {
    title: sanityPost.title,
    date: sanityPost.publishedAt?.slice(0, 10) ?? "",
    readMin: sanityPost.readMin ?? 5,
    tag: sanityPost.tag,
    bodyParagraphs:
      Array.isArray(sanityPost.body) && (sanityPost.body as unknown[]).length > 0
        ? // Render Portable Text to plain paragraphs here for now.
          (sanityPost.body as unknown[])
            .map((b) => portableTextToPlain(b))
            .filter(Boolean)
        : [sanityPost.excerpt],
    authorSlug: sanityPost.authorSlug,
    relatedSlugs: sanityPost.relatedSlugs,
  }

  const [author, glossaryTerms] = await Promise.all([
    view.authorSlug ? getAuthorBySlug(view.authorSlug).catch(() => null) : Promise.resolve(null),
    listGlossaryTerms(locale).catch(() => []),
  ])

  const products = await getStorefrontCatalogue()
  const r = await getTranslations({ locale, namespace: "research" })
  const related = (view.relatedSlugs ?? [])
    .map((s) => products.find((p) => p.slug === s))
    .filter(Boolean)

  return (
    <Container size="narrow" className="py-16">
      <Link
        href={`/${locale}/blog`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3 w-3" /> {r("allResearch")}
      </Link>

      <Badge tone="muted" className="mb-4">
        {view.tag}
      </Badge>
      <h1 className="h-page">{view.title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {view.date}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {r("readMinutes", { count: view.readMin ?? 0 })}
        </span>
        {author ? (
          <Link
            href={`/${locale}/blog/author/${author.slug}`}
            className="flex items-center gap-1 hover:text-accent"
          >
            <User className="h-3 w-3" />
            {author.name}
          </Link>
        ) : null}
      </div>

      <article className="prose prose-lg mt-10 max-w-none">
        {(view.bodyParagraphs ?? []).map((p, i) => (
          <p key={`${i}:${p.slice(0, 30)}`} className="mb-6 text-ink leading-relaxed text-pretty">
            <AnnotatedParagraph text={p} terms={glossaryTerms} locale={locale} />
          </p>
        ))}
      </article>

      {related.length > 0 ? (
        <aside className="mt-16 rounded-[var(--radius-lg)] border border-line bg-surface-2 p-6">
          <h3 className="font-display text-lg font-semibold">{r("browse")}</h3>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r?.slug}>
                <Link
                  href={`/${locale}/shop/${r?.slug}`}
                  className="flex items-center justify-between rounded-[var(--radius)] border border-line bg-surface p-3 hover:border-accent"
                >
                  <span className="font-medium">{r?.defaultTranslation.name}</span>
                  <ChevronRight className="h-4 w-4 text-ink-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <div className="mt-12 rounded-[var(--radius)] border border-warn/30 bg-warn-soft/40 p-4 text-sm text-ink">
        {r("faqUseAnswer")}
      </div>
    </Container>
  )
}

/**
 * Inline-render a paragraph with automatic glossary-term links.
 */
function AnnotatedParagraph({
  text,
  terms,
  locale,
}: {
  text: string
  terms: { term: string; slug: string }[]
  locale: string
}) {
  const hits = annotateWithGlossary(text, terms as never)
  return (
    <>
      {hits.map((h, i) => {
        if (h.kind === "link") {
          return (
            <Link
              key={`${i}:${h.text}`}
              href={`/${locale}${h.href}`}
              className="text-accent hover:underline"
            >
              {h.text}
            </Link>
          )
        }
        return <span key={`${i}:${h.text}`}>{h.text}</span>
      })}
    </>
  )
}

/**
 * Tiny Portable-Text → plain text fallback. When Sanity is wired up
 * properly, replace with `@portabletext/react` for full formatting.
 */
function portableTextToPlain(block: unknown): string {
  if (!block || typeof block !== "object") return ""
  const b = block as { _type?: string; children?: unknown[] }
  if (b._type !== "block") return ""
  if (!Array.isArray(b.children)) return ""
  return b.children
    .map((c) =>
      c && typeof c === "object" && "text" in c ? String((c as { text: string }).text ?? "") : "",
    )
    .join("")
}
