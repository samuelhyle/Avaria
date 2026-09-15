import { getCurrentMember } from "@/lib/community"
import { createPlan, listPlansForOwner } from "@/lib/research-plans"
import { NextResponse } from "next/server"
import { z } from "zod"

export async function GET() {
  const member = await getCurrentMember()
  if (!member) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  try {
    const plans = await listPlansForOwner(member.id)
    return NextResponse.json({ plans })
  } catch {
    return NextResponse.json({ error: "Failed to load plans." }, { status: 500 })
  }
}

const Body = z.object({
  title: z.string().min(3).max(140),
  notes: z.string().max(2000).optional(),
})

export async function POST(req: Request) {
  const member = await getCurrentMember()
  if (!member)
    return NextResponse.json({ ok: false, reason: "Authentication required." }, { status: 401 })

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
    const result = await createPlan(parsed.data)
    if (!result.ok) return NextResponse.json(result, { status: 422 })
    return NextResponse.json(result, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, reason: "Failed to create plan." }, { status: 500 })
  }
}
