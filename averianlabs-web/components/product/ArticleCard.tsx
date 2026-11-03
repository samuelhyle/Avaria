import type { BlogPostRecord } from "@/lib/blog/posts"
import { formatDate } from "@/lib/utils/format"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

/**
 * One research article, as a card.
 *
 * The article is the shop's own writing about the compound, so the card
 * carries the same things the article list carries: the subject it is filed
 * under, its title, its opening paragraph and how long it takes to read.
 */
export function ArticleCard({
  post,
  locale,
  readMinutes,
}: {
  post: BlogPostRecord
  locale: string
  readMinutes: string
}) {
  return (
    <Link
      href={`/${locale}/blog/${post.slug}`}
      className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--shadow)]"
    >
      <span className="inline-flex w-fit items-center rounded-full bg-surface-3 px-2.5 py-1 text-2xs font-semibold uppercase tracking-wider text-ink-muted">
        {post.tag}
      </span>
      <h4 className="mt-3 font-display text-base font-semibold leading-snug text-ink text-pretty group-hover:text-accent">
        {post.title}
      </h4>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted text-pretty">
        {post.excerpt}
      </p>
      <span className="mt-auto flex items-center justify-between pt-4 text-2xs text-ink-subtle">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
        <span className="flex items-center gap-1">
          {readMinutes}
          <ArrowRight aria-hidden className="h-3 w-3" />
        </span>
      </span>
    </Link>
  )
}
