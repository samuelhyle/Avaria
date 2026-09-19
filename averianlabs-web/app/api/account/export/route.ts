import { isDatabaseConfigured } from "@/lib/db"
import { exportUserData, recordExportRequest, requireMember } from "@/lib/gdpr"
import { logger } from "@/lib/logger"
import { rateLimit } from "@/lib/security/rate-limit"
import { NextResponse } from "next/server"

export async function POST() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Account export is offline." }, { status: 503 })
  }
  const member = await requireMember().catch((err) => {
    logger.error("[account:export] auth lookup failed", err)
    return null
  })
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
  } catch (err) {
    logger.error("[account:export] export failed", err)
    return NextResponse.json({ error: "Failed to export." }, { status: 500 })
  }
}
