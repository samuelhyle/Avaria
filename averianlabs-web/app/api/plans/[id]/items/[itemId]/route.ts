import { getCurrentMember } from "@/lib/community"
import { removeItemFromPlan } from "@/lib/research-plans"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { NextResponse } from "next/server"

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  const csrf = assertCsrfOr403(_req, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

  const member = await getCurrentMember()
  if (!member)
    return NextResponse.json({ ok: false, reason: "Authentication required." }, { status: 401 })
  const { id, itemId } = await ctx.params
  try {
    const result = await removeItemFromPlan(id, itemId)
    if (!result.ok) return NextResponse.json(result, { status: 422 })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ ok: false, reason: "Failed." }, { status: 500 })
  }
}
