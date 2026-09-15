import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { getAuthorBySlug } from "@/lib/blog/authors"
import { getPostBySlug, listAllPostSlugs, listPosts } from "@/lib/blog/posts"
import { annotateWithGlossary, listGlossaryTerms } from "@/lib/glossary"
import { products } from "@/lib/products/data"
import { ArrowLeft, Calendar, ChevronRight, Clock, User } from "lucide-react"
import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

// Hardcoded fallback posts — kept identical to the previous in-repo content so
// local development without Sanity still renders.
const FALLBACK_POSTS: Record<
  string,
  {
    title: string
    date: string
    readMin: number
    tag: string
    body: string[]
    relatedSlugs: string[]
  }
> = {
  "bpc-157-overview": {
    title: "BPC-157: a 15-amino-acid fragment and what it does in tissue models",
    date: "2026-08-12",
    readMin: 9,
    tag: "Recovery",
    body: [
      "BPC-157 (Body Protection Compound, 15 amino acids, sequence GEPPPGKPADDAGLV) was first isolated from gastric juice in the 1990s and has since accumulated a substantial preclinical literature across tissue-recovery models.",
      "Mechanistically, BPC-157 has been shown in vitro to upregulate VEGFR2 and promote angiogenesis via the eNOS pathway. In rodent tendon models, it accelerates fibroblast outgrowth; in gut models, it protects the mucosa against NSAID-induced damage.",
      "This article summarises the key papers, the assays used to verify mechanism, and where the evidence base is thinnest.",
    ],
    relatedSlugs: ["tb-500", "ghk-cu"],
  },
  "semaglutide-research": {
    title: "Semaglutide: the long-acting GLP-1 analog, mechanism by mechanism",
    date: "2026-07-21",
    readMin: 12,
    tag: "Metabolic",
    body: [
      "Semaglutide is a 30-amino-acid peptide with two key structural modifications vs. native GLP-1: an Aib residue at position 2 (DPP-IV resistance) and a C18 diacid side chain on Lys26 (albumin binding → 7-day half-life).",
      "This article walks through each modification, the assays used to confirm pharmacokinetics, and the analytical fingerprint you'd expect to see on a high-purity batch.",
    ],
    relatedSlugs: ["tirzepatide"],
  },
  "tirzepatide-dual-agonist": {
    title: "Tirzepatide and the GIP/GLP-1 dual-agonist story",
    date: "2026-07-04",
    readMin: 8,
    tag: "Metabolic",
    body: [
      "Tirzepatide is a 39-amino-acid synthetic peptide featuring a GIP analog conjugated to a GLP-1 analog via a C16 diacid linker.",
    ],
    relatedSlugs: ["semaglutide"],
  },
  "ghk-cu-copper": {
    title: "GHK-Cu and the renaissance of copper-peptide cosmetic research",
    date: "2026-06-18",
    readMin: 6,
    tag: "Cosmetic",
    body: [
      "Gly-His-Lys complexed with Cu²⁺ — a 401.9 Da tripeptide first noted for wound-healing properties in the 1970s.",
    ],
    relatedSlugs: ["bpc-157"],
  },
  "tb-500-thymosin": {
    title: "TB-500 fragment: what Thymosin β4 actually does in actin sequestration",
    date: "2026-06-02",
    readMin: 7,
    tag: "Recovery",
    body: ["The TB-500 fragment corresponds to the actin-binding domain of Thymosin β4 (LKKTETQ)."],
    relatedSlugs: ["bpc-157"],
  },
  "epithalon-telomerase": {
    title: "Epithalon and telomerase: what the 4-amino-acid tetrapeptide actually does",
    date: "2026-05-20",
    readMin: 10,
    tag: "Longevity",
    body: ["Ala-Glu-Asp-Gly — a tetrapeptide originally isolated from pineal-gland extract."],
    relatedSlugs: [],
  },
}

export async function generateStaticParams() {
  const sanitySlugs = await listAllPostSlugs()
  const fallbackSlugs = Object.keys(FALLBACK_POSTS)
  const slugs = Array.from(new Set([...sanitySlugs, ...fallbackSlugs]))
  return slugs.flatMap((slug) => ["en", "fi", "de", "sv", "nl"].map((locale) => ({ locale, slug })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const sanityPost = await getPostBySlug(slug).catch(() => null)
  const fallback = FALLBACK_POSTS[slug]
  const title = sanityPost?.title ?? fallback?.title ?? slug
  const excerpt = sanityPost?.excerpt ?? fallback?.body[0] ?? ""
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
  const sanityPost = await getPostBySlug(slug).catch(() => null)
  const fallback = FALLBACK_POSTS[slug]

  if (!sanityPost && !fallback) notFound()

  // Build a unified view the renderer can use.
  const view = sanityPost
    ? {
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
    : {
        title: fallback?.title,
        date: fallback?.date,
        readMin: fallback?.readMin,
        tag: fallback?.tag,
        bodyParagraphs: fallback?.body,
        authorSlug: null,
        relatedSlugs: fallback?.relatedSlugs,
      }

  const [author, glossaryTerms] = await Promise.all([
    view.authorSlug ? getAuthorBySlug(view.authorSlug).catch(() => null) : Promise.resolve(null),
    listGlossaryTerms().catch(() => []),
  ])

  const related = (view.relatedSlugs ?? [])
    .map((s) => products.find((p) => p.slug === s))
    .filter(Boolean)

  return (
    <Container size="narrow" className="py-16">
      <Link
        href={`/${locale}/blog`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3 w-3" /> All research
      </Link>

      <Badge tone="muted" className="mb-4">
        {view.tag}
      </Badge>
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl text-balance">
        {view.title}
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {view.date}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {view.readMin} min read
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
          <p key={i} className="mb-6 text-ink leading-relaxed text-pretty">
            <AnnotatedParagraph text={p} terms={glossaryTerms} locale={locale} />
          </p>
        ))}
      </article>

      {related.length > 0 ? (
        <aside className="mt-16 rounded-[var(--radius-lg)] border border-line bg-surface-2 p-6">
          <h3 className="font-display text-lg font-semibold">Related research peptides</h3>
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
        <strong className="font-semibold">Research use only.</strong> All products sold by
        AverianLabs are intended strictly for laboratory research and in-vitro studies.
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
            <Link key={i} href={`/${locale}${h.href}`} className="text-accent hover:underline">
              {h.text}
            </Link>
          )
        }
        return <span key={i}>{h.text}</span>
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
