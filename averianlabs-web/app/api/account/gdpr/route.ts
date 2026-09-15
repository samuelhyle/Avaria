import { gdprRequests } from "@/db/schema"
import { getCurrentMember } from "@/lib/community"
import { db } from "@/lib/db"
import { accountDeletionHtml, sendEmail } from "@/lib/email"
import { getServerEnv } from "@/lib/env"
import { recordExportRequest } from "@/lib/gdpr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Request a destructive action — sends a confirmation email.
 * For export, also dispatches the export immediately (Art. 20 has no
 * confirmation requirement; Art. 17 delete does).
 */
export async function POST(req: Request) {
  const member = await getCurrentMember()
  if (!member) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const kind = (body as { kind?: string } | null)?.kind
  if (kind !== "export" && kind !== "delete") {
    return NextResponse.json({ error: "kind must be 'export' or 'delete'." }, { status: 400 })
  }

  try {
    if (kind === "export") {
      await recordExportRequest(member.id)
      // The synchronous /api/account/export endpoint produces the archive;
      // this records the Art. 20 request for the audit trail.
      return NextResponse.json({ ok: true, kind: "export" })
    }

    // delete — generate a one-time confirmation token and email the link.
    const token = crypto.randomUUID().replace(/-/g, "")
    const expires = new Date(Date.now() + TOKEN_TTL_MS)
    await db.insert(gdprRequests).values({
      id: crypto.randomUUID(),
      userId: member.id,
      kind: "delete",
      status: "pending",
      token,
      tokenExpiresAt: expires,
    })

    const env = getServerEnv()
    if (env.RESEND_API_KEY) {
      const store = await cookies()
      const locale = store.get("NEXT_LOCALE")?.value ?? "en"
      const origin = env.AUTH_URL ?? new URL(req.url).origin
      const url = `${origin}/${locale}/account/delete/confirm/${token}`
      await sendEmail({
        to: member.email,
        subject: "Confirm your AverianLabs account deletion",
        html: accountDeletionHtml({ url }),
      })
    }

    return NextResponse.json({
      ok: true,
      kind: "delete",
      confirmationExpiresAt: expires.toISOString(),
    })
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 })
  }
}
