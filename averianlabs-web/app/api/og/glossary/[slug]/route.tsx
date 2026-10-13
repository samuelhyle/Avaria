import { CATEGORY_LABELS, getGlossaryTermBySlug } from "@/lib/glossary"
import { ogLocale, renderOg } from "@/lib/og/render"

export const runtime = "nodejs"

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const locale = ogLocale(req)
  const term = await getGlossaryTermBySlug(slug, locale).catch(() => null)
  if (!term) return new Response("Not found", { status: 404 })
  return renderOg({
    locale,
    kind: locale === "fi" ? "Sanasto" : "Glossary",
    title: term.term,
    subtitle: term.shortDefinition,
    badge:
      locale === "fi" ? "Laboratorion sanasto" : (CATEGORY_LABELS[term.category] ?? term.category),
    meta:
      term.synonyms && term.synonyms.length > 0
        ? `${locale === "fi" ? "Myös" : "Also"}: ${term.synonyms.join(", ")}`
        : undefined,
  })
}
