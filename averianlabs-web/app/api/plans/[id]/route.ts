import { getCurrentMember } from "@/lib/community"
import { deletePlan, getPlanForOwner, sharePlan, updatePlan } from "@/lib/research-plans"
import { NextResponse } from "next/server"
import { z } from "zod"

const Patch = z.object({
  title: z.string().min(3).max(140).optional(),
  notes: z.string().max(2000).optional(),
  isPublic: z.boolean().optional(),
})

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  const { id } = await ctx.params
  try {
    const plan = await getPlanForOwner(id, member.id)
    if (!plan) return NextResponse.json({ error: "Not found." }, { status: 404 })
    return NextResponse.json({ plan })
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 })
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember()
  if (!member)
    return NextResponse.json({ ok: false, reason: "Authentication required." }, { status: 401 })
  const { id } = await ctx.params
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON." }, { status: 400 })
  }
  const parsed = Patch.safeParse(json)
  if (!parsed.success)
    return NextResponse.json({ ok: false, reason: "Invalid input." }, { status: 400 })

  try {
    if (parsed.data.isPublic !== undefined) {
      const shareResult = await sharePlan(id, parsed.data.isPublic)
      if (!shareResult.ok) return NextResponse.json(shareResult, { status: 422 })
    }
    const { isPublic: _ignored, ...rest } = parsed.data
    if (Object.keys(rest).length > 0) {
      const result = await updatePlan(id, rest)
      if (!result.ok) return NextResponse.json(result, { status: 422 })
    }
    const plan = await getPlanForOwner(id, member.id)
    return NextResponse.json({ ok: true, plan })
  } catch {
    return NextResponse.json({ ok: false, reason: "Failed." }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember()
  if (!member)
    return NextResponse.json({ ok: false, reason: "Authentication required." }, { status: 401 })
  const { id } = await ctx.params
  try {
    const result = await deletePlan(id)
    if (!result.ok) return NextResponse.json(result, { status: 422 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, reason: "Failed." }, { status: 500 })
  }
}
