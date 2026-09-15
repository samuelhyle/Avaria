import { renderOg } from "@/lib/og/render"
import { getPlanByShareSlug } from "@/lib/research-plans"

export const runtime = "nodejs"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const plan = await getPlanByShareSlug(slug).catch(() => null)
  if (!plan) return new Response("Not found", { status: 404 })
  return renderOg({
    kind: "Plan",
    title: plan.title || "Research plan",
    subtitle: plan.notes?.slice(0, 160),
    badge: "Shared",
    meta: `${plan.items.length} product${plan.items.length === 1 ? "" : "s"} in this plan`,
  })
}
