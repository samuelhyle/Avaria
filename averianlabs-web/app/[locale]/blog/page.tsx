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

const FALLBACK_INDEX: IndexPost[] = [
  {
    slug: "bpc-157-overview",
    title: "BPC-157: a 15-amino-acid fragment and what it does in tissue models",
    excerpt:
      "We review the in-vitro and in-vivo literature on BPC-157's role in angiogenesis, fibroblast activity, and the gut–tendon axis.",
    date: "2026-08-12",
    readMin: 9,
    tag: "Recovery",
  },
  {
    slug: "semaglutide-research",
    title: "Semaglutide: the long-acting GLP-1 analog, mechanism by mechanism",
    excerpt:
      "A walkthrough of the structural modifications that give semaglutide its 7-day half-life, and the assays used to verify it.",
    date: "2026-07-21",
    readMin: 12,
    tag: "Metabolic",
  },
  {
    slug: "tirzepatide-dual-agonist",
    title: "Tirzepatide and the GIP/GLP-1 dual-agonist story",
    excerpt:
      "How a single peptide binds two receptors — and why that matters in metabolic disease research.",
    date: "2026-07-04",
    readMin: 8,
    tag: "Metabolic",
  },
  {
    slug: "ghk-cu-copper",
    title: "GHK-Cu and the renaissance of copper-peptide cosmetic research",
    excerpt: "From 1973 to 2026 — the rediscovery of a tripeptide that was always quietly working.",
    date: "2026-06-18",
    readMin: 6,
    tag: "Cosmetic",
  },
  {
    slug: "tb-500-thymosin",
    title: "TB-500 fragment: what Thymosin β4 actually does in actin sequestration",
    excerpt: "The actin-binding story behind the most-studied tissue-recovery peptide fragment.",
    date: "2026-06-02",
    readMin: 7,
    tag: "Recovery",
  },
  {
    slug: "epithalon-telomerase",
    title: "Epithalon and telomerase: what the 4-amino-acid tetrapeptide actually does",
    excerpt:
      "Pineal-gland research, telomerase expression, and the limits of what a 4-amino-acid tetrapeptide can claim.",
    date: "2026-05-20",
    readMin: 10,
    tag: "Longevity",
  },
]

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
  const sanity = await listPosts().catch(() => [])
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
      : FALLBACK_INDEX

  return (
    <Container className="py-16">
      <header className="mb-12 max-w-2xl">
        <Badge tone="accent" className="mb-4">
          Research desk
        </Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("blogHeading")}
        </h1>
        <p className="mt-3 text-ink-muted">
          Long-form, citation-backed essays on the peptides we sell.
        </p>
      </header>

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
                {post.readMin} min <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Container>
  )
}
