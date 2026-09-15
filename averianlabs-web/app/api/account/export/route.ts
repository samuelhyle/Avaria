import { exportUserData, recordExportRequest, requireMember } from "@/lib/gdpr"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"

export async function POST() {
  const member = await requireMember().catch(() => null)
  if (!member) return NextResponse.json({ error: "Authentication required." }, { status: 401 })

  const limit = await rateLimit(`account:export:${member.id}`, { limit: 3, window: "1 d" })
  if (!limit.success) {
    return NextResponse.json({ error: "Too many export requests." }, { status: 429 })
  }

  try {
    const data = await exportUserData(member.id)
    await recordExportRequest(member.id)
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "content-disposition": `attachment; filename="averianlabs-data-${member.id}.json"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to export." }, { status: 500 })
  }
}
