import { getCurrentMember } from "@/lib/community"
import { addItemToPlan } from "@/lib/research-plans"
import { NextResponse } from "next/server"
import { z } from "zod"

const Body = z.object({
  productId: z.string().min(1).max(64),
})

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
  const parsed = Body.safeParse(json)
  if (!parsed.success)
    return NextResponse.json({ ok: false, reason: "Invalid input." }, { status: 400 })

  try {
    const result = await addItemToPlan(id, parsed.data.productId)
    if (!result.ok) return NextResponse.json(result, { status: 422 })
    return NextResponse.json(result, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, reason: "Failed." }, { status: 500 })
  }
}
