import { runCryptoWatcher } from "@/lib/crypto/watcher"
import { logger } from "@/lib/logger"
import { isAuthorizedCronRequest } from "@/lib/security/cron"
import { deliverTelegramOutbox } from "@/lib/telegram/outbox"
import { NextResponse } from "next/server"

export const maxDuration = 25

/**
 * The crypto watcher.
 *
 * Polls the configured chains for deposits, matches them to open invoices,
 * marks the orders paid and queues the buyer and team notifications. A
 * scheduler should call this every minute or two.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request))
    return NextResponse.json({ code: "unauthorized" }, { status: 401 })
  try {
    const report = await runCryptoWatcher()
    const delivery = await deliverTelegramOutbox()
    return NextResponse.json({ ...report, telegram: delivery })
  } catch (error) {
    logger.error("[crypto] watcher failed", error)
    return NextResponse.json({ code: "watcher_unavailable" }, { status: 503 })
  }
}
