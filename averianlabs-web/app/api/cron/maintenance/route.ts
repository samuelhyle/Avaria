import { syncCatalogueIndex } from "@/lib/ai/rag/indexer"
import { processModerationJobs } from "@/lib/community/moderation"
import { deliverEmailOutbox } from "@/lib/email/outbox"
import { purgeDeletedUsers } from "@/lib/gdpr/service"
import { releaseExpiredReservations } from "@/lib/orders"
import { isAuthorizedCronRequest } from "@/lib/security/cron"
import { NextResponse } from "next/server"

export const maxDuration = 60
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request))
    return NextResponse.json({ code: "unauthorized" }, { status: 401 })
  const released = await releaseExpiredReservations()
  const purged = await purgeDeletedUsers()
  const delivery = await deliverEmailOutbox()
  const moderation = await processModerationJobs()
  const index = await syncCatalogueIndex()
  return NextResponse.json({ released, purged, ...delivery, moderation, index })
}
