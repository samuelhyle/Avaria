import { ogLocale, renderOg } from "@/lib/og/render"
import { getPlanByShareSlug } from "@/lib/research-plans"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const locale = ogLocale(req)
  const plan = await getPlanByShareSlug(slug, locale).catch(() => null)
  if (!plan) return new Response("Not found", { status: 404 })
  const response = await renderOg({
    locale,
    kind: locale === "fi" ? "Suunnitelma" : "Plan",
    title: plan.title || (locale === "fi" ? "Tutkimussuunnitelma" : "Research plan"),
    subtitle: plan.notes?.slice(0, 160),
    badge: locale === "fi" ? "Jaettu" : "Shared",
    meta:
      locale === "fi"
        ? `${plan.items.length} ${plan.items.length === 1 ? "tuote" : "tuotetta"} suunnitelmassa`
        : `${plan.items.length} product${plan.items.length === 1 ? "" : "s"} in this plan`,
  })
  response.headers.set("cache-control", "private, no-store")
  return response
}
