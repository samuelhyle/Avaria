import { getPlanByShareSlug } from "@/lib/research-plans"
import { NextResponse } from "next/server"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  try {
    const plan = await getPlanByShareSlug(slug)
    if (!plan) return NextResponse.json({ error: "Not found." }, { status: 404 })
    // Strip owner info from public response
    return NextResponse.json({
      plan: {
        id: plan.id,
        title: plan.title,
        notes: plan.notes,
        shareSlug: plan.shareSlug,
        createdAt: plan.createdAt,
        items: plan.items,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 })
  }
}
