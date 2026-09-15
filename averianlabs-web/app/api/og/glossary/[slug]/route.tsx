import { CATEGORY_LABELS, getGlossaryTermBySlug } from "@/lib/glossary"
import { renderOg } from "@/lib/og/render"

export const runtime = "nodejs"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const term = await getGlossaryTermBySlug(slug).catch(() => null)
  if (!term) return new Response("Not found", { status: 404 })
  return renderOg({
    kind: "Glossary",
    title: term.term,
    subtitle: term.shortDefinition,
    badge: CATEGORY_LABELS[term.category] ?? term.category,
    meta:
      term.synonyms && term.synonyms.length > 0 ? `Also: ${term.synonyms.join(", ")}` : undefined,
  })
}
