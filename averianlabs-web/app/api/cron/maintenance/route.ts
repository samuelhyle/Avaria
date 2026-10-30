import { syncCatalogueIndex } from "@/lib/ai/rag/indexer"
import { processModerationJobs } from "@/lib/community/moderation"
import { expireStaleSessions } from "@/lib/crypto/watcher"
import { deliverEmailOutbox } from "@/lib/email/outbox"
import { purgeDeletedUsers } from "@/lib/gdpr/service"
import { sendNotificationDigests } from "@/lib/notifications/digest"
import { releaseExpiredReservations } from "@/lib/orders"
import { isAuthorizedCronRequest } from "@/lib/security/cron"
import { deliverTelegramOutbox } from "@/lib/telegram/outbox"
import { NextResponse } from "next/server"

export const maxDuration = 25
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request))
    return NextResponse.json({ code: "unauthorized" }, { status: 401 })
  // The host that serves the site kills a scheduled function after 30 seconds.
  // Both outboxes are drained with a bounded batch so the run finishes inside
  // the budget; the remainder is picked up by the next run.
  const startedAt = Date.now()
  const released = await releaseExpiredReservations()
  const purged = await purgeDeletedUsers()
  // Crypto invoices close here too, so an expired invoice is released even if
  // the chain watcher is not running.
  const cryptoExpired = await expireStaleSessions().catch(() => 0)
  const delivery = await deliverEmailOutbox(20)
  const telegram = await deliverTelegramOutbox(20)
  // The digest covers the notifications a customer did not open. It runs on
  // every sweep but only sends what is more than a day old and not already
  // digested.
  const digest = await sendNotificationDigests().catch(() => ({
    users: 0,
    notifications: 0,
    sent: 0,
  }))
  const moderation = await processModerationJobs()
  const index = await syncCatalogueIndex()
  return NextResponse.json({
    released,
    purged,
    cryptoExpired,
    ...delivery,
    telegram,
    digest,
    moderation,
    index,
    durationMs: Date.now() - startedAt,
  })
}
