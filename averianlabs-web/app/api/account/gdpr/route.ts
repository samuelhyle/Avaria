import { gdprRequests } from "@/db/schema"
import { getCurrentMember } from "@/lib/community"
import { db } from "@/lib/db"
import { accountDeletionHtml, actionEmailSubject } from "@/lib/email"
import { deliverEmailOutbox, enqueueEmail } from "@/lib/email/outbox"
import { getServerEnv } from "@/lib/env"
import { recordExportRequest } from "@/lib/gdpr"
import { locales } from "@/lib/i18n/config"
import { assertCsrfOr403, csrfAllowsDevHosts } from "@/lib/security/csrf"
import { NextResponse } from "next/server"

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Request a destructive action — sends a confirmation email.
 * For export, also dispatches the export immediately (Art. 20 has no
 * confirmation requirement; Art. 17 delete does).
 */
export async function POST(req: Request) {
  const csrf = assertCsrfOr403(req, { allowDevHosts: csrfAllowsDevHosts() })
  if (csrf) return csrf

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
    const requestedLocale = (body as { locale?: string }).locale
    const locale = locales.find((l) => l === requestedLocale) ?? "en"
    await db.transaction(async (tx) => {
      await tx.insert(gdprRequests).values({
        id: crypto.randomUUID(),
        userId: member.id,
        kind: "delete",
        status: "pending",
        token,
        tokenExpiresAt: expires,
      })
      const origin = getServerEnv().AUTH_URL ?? new URL(req.url).origin
      const url = `${origin}/${locale}/account/delete/confirm/${token}`
      await enqueueEmail(
        {
          to: member.email,
          subject: actionEmailSubject("deletion", locale),
          html: accountDeletionHtml({ url, locale }),
        },
        `deletion:${token}`,
        tx,
      )
    })
    await deliverEmailOutbox().catch(() => undefined)

    return NextResponse.json({
      ok: true,
      kind: "delete",
      confirmationExpiresAt: expires.toISOString(),
    })
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 })
  }
}
