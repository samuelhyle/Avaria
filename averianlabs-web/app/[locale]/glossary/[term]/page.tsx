import { GlossaryTermJsonLd } from "@/components/seo/JsonLd"
import { Badge } from "@/components/ui/Badge"
import { Container } from "@/components/ui/Container"
import { CATEGORY_LABELS, getGlossaryTermBySlug } from "@/lib/glossary"
import { ArrowLeft, BookText } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ locale: string; term: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, term } = await params
  const record = await getGlossaryTermBySlug(term).catch(() => null)
  if (!record) return { title: "Not found" }
  return {
    title: record.term,
    description: record.shortDefinition,
    alternates: { canonical: `/${locale}/glossary/${term}` },
    openGraph: {
      title: record.term,
      description: record.shortDefinition,
      type: "article",
      images: [`/api/og/glossary/${term}`],
    },
  }
}

export default async function GlossaryTermPage({ params }: Props) {
  const { locale, term: slug } = await params
  setRequestLocale(locale)
  const record = await getGlossaryTermBySlug(slug).catch(() => null)
  if (!record) notFound()
  const t = await getTranslations("glossary")

  const hasBody = Array.isArray(record.body) && record.body.length > 0

  return (
    <Container size="narrow" className="py-12">
      <GlossaryTermJsonLd
        term={record.term}
        shortDefinition={record.shortDefinition}
        url={`https://averianlabs.eu/${locale}/glossary/${slug}`}
        locale={locale}
      />
      <Link
        href={`/${locale}/glossary`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToIndex")}
      </Link>

      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="muted" size="sm">
            {CATEGORY_LABELS[record.category] ?? record.category}
          </Badge>
          {record.synonyms && record.synonyms.length > 0 ? (
            <span className="font-mono text-2xs text-ink-subtle">
              {t("synonymsLabel")}: {record.synonyms.join(", ")}
            </span>
          ) : null}
        </div>
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
            <BookText className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {record.term}
          </h1>
        </div>
        <p className="mt-4 text-base text-ink-muted">{record.shortDefinition}</p>
      </header>

      {hasBody ? <PortableTextLite value={record.body as unknown[]} /> : null}

      {record.relatedTerms && record.relatedTerms.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
            {t("relatedTermsHeading")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {record.relatedTerms.map((rt) => (
              <Link
                key={rt._id}
                href={`/${locale}/glossary/${rt.slug}`}
                className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink hover:border-accent/40 hover:bg-accent-soft/40"
              >
                {rt.term}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {record.relatedProductSlugs && record.relatedProductSlugs.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-subtle">
            {t("relatedProductsHeading")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {record.relatedProductSlugs.map((s) => (
              <Link
                key={s}
                href={`/${locale}/shop/${s}`}
                className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink hover:border-accent/40 hover:bg-accent-soft/40"
              >
                {s}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  )
}

/**
 * Tiny Portable-Text renderer — handles the common block types
 * (paragraph, h2/h3, lists, image) without pulling in @portabletext/react.
 * Add `@portabletext/react` later for the full feature set.
 */
interface PTBlock {
  _type: string
  _key?: string
  style?: string
  level?: number
  listItem?: string
  children?: PTBlock[]
  markDefs?: unknown[]
  asset?: { _ref?: string; url?: string; metadata?: { lqip?: string } }
}
function PortableTextLite({ value }: { value: unknown[] }) {
  return (
    <article className="prose prose-sm max-w-none text-ink">
      {value.map((raw, i) => {
        const block = raw as PTBlock
        if (block._type === "block") {
          const style = block.style ?? "normal"
          const text = (block.children ?? [])
            .map((c) =>
              typeof c === "object" && c && "text" in c
                ? String((c as { text: string }).text ?? "")
                : "",
            )
            .join("")
          if (style === "h2")
            return (
              <h2 key={block._key ?? i} className="mt-8 text-xl font-semibold">
                {text}
              </h2>
            )
          if (style === "h3")
            return (
              <h3 key={block._key ?? i} className="mt-6 text-base font-semibold">
                {text}
              </h3>
            )
          if (block.listItem === "bullet")
            return (
              <li key={block._key ?? i} className="ml-5 list-disc">
                {text}
              </li>
            )
          if (block.listItem === "number")
            return (
              <li key={block._key ?? i} className="ml-5 list-decimal">
                {text}
              </li>
            )
          return (
            <p key={block._key ?? i} className="my-3 leading-relaxed text-ink">
              {text}
            </p>
          )
        }
        if (block._type === "image" && block.asset?.url) {
          return (
            <div
              key={block._key ?? i}
              className="relative my-6 h-64 w-full overflow-hidden rounded-[var(--radius)] border border-line"
            >
              <Image
                src={block.asset.url}
                alt=""
                fill
                sizes="(min-width: 1024px) 768px, 100vw"
                className="object-cover"
              />
            </div>
          )
        }
        return null
      })}
    </article>
  )
}
