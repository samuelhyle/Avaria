/**
 * `pnpm ai:gc` — conversation + memory GC.
 *
 * Two retention policies run here:
 *
 *   1. Anonymized-id conversations older than 90 days that have not been
 *      active are hard-deleted. We only retain anonymous-user data for a
 *      quarter — this matches our privacy notice and prevents unbounded
 *      growth of the `ai_messages` table.
 *
 *   2. Hard-deleted conversations (the soft-delete row we keep for audit)
 *      are purged 30 days after `deletedAt`. The soft-delete window lets
 *      the user undo an accidental clear; the hard purge is GDPR-grade.
 *
 * Memory rows (`user_memories`) are NOT touched here — they're per-user
 * and only deleted on account-deletion / explicit user action.
 *
 * Usage:
 *   pnpm ai:gc                      # default 90 / 30 day cutoffs
 *   pnpm ai:gc --conversation-days=60
 *   pnpm ai:gc --hard-delete-days=14
 *
 * Requires DATABASE_URL.
 */

import { aiConversations, aiMessages } from "@/db/schema/ai"
import { and, eq, isNotNull, isNull, lt, sql } from "drizzle-orm"

import { db, isDatabaseConfigured } from "@/lib/db"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"

interface ParsedArgs {
  conversationDays: number
  hardDeleteDays: number
}

function parseArgs(argv: string[]): ParsedArgs {
  let conversationDays = 90
  let hardDeleteDays = 30
  for (const arg of argv) {
    if (arg.startsWith("--conversation-days=")) {
      conversationDays = Number.parseInt(arg.slice("--conversation_days=".length), 10)
    } else if (arg.startsWith("--hard-delete-days=")) {
      hardDeleteDays = Number.parseInt(arg.slice("--hard_delete_days=".length), 10)
    }
  }
  if (!Number.isFinite(conversationDays) || conversationDays <= 0) conversationDays = 90
  if (!Number.isFinite(hardDeleteDays) || hardDeleteDays <= 0) hardDeleteDays = 30
  return { conversationDays, hardDeleteDays }
}

async function main() {
  if (!isDatabaseConfigured()) {
    logger.warn("ai_gc.skipped", { reason: "database not configured" })
    return
  }
  getServerEnv() // fail-fast on bad env
  const { conversationDays, hardDeleteDays } = parseArgs(process.argv.slice(2))
  logger.info("ai_gc.start", { conversationDays, hardDeleteDays })

  const now = new Date()
  const conversationCutoff = new Date(now.getTime() - conversationDays * 24 * 60 * 60 * 1000)
  const hardDeleteCutoff = new Date(now.getTime() - hardDeleteDays * 24 * 60 * 60 * 1000)

  // 1. Anonymous conversations that haven't been active in N days.
  const anonymousConv = await db
    .delete(aiConversations)
    .where(
      and(
        isNull(aiConversations.userId),
        isNotNull(aiConversations.anonymousId),
        lt(aiConversations.lastMessageAt, conversationCutoff),
        isNull(aiConversations.deletedAt),
      ),
    )
    .returning({ id: aiConversations.id })
  logger.info("ai_gc.anonymous_conversations_deleted", { count: anonymousConv.length })

  // 2. Soft-deleted conversations past the hard-delete window.
  const hardDeleted = await db
    .delete(aiConversations)
    .where(
      and(isNotNull(aiConversations.deletedAt), lt(aiConversations.deletedAt, hardDeleteCutoff)),
    )
    .returning({ id: aiConversations.id })
  logger.info("ai_gc.hard_deleted_conversations_purged", { count: hardDeleted.length })

  // Orphan-message sweep: messages whose conversation was just removed
  // shouldn't linger (FK with ON DELETE CASCADE handles it, but the
  // explicit delete ensures we surface any drift in tests / staging).
  const orphanMessages = await db
    .delete(aiMessages)
    .where(
      sql`NOT EXISTS (SELECT 1 FROM ${aiConversations} c WHERE c.id = ${aiMessages.conversationId})`,
    )
    .returning({ id: aiMessages.id })
  logger.info("ai_gc.orphan_messages_purged", { count: orphanMessages.length })

  logger.info("ai_gc.done", {
    conversationCutoff: conversationCutoff.toISOString(),
    hardDeleteCutoff: hardDeleteCutoff.toISOString(),
  })
}

main().catch((err) => {
  logger.error("ai_gc.failed", err)
  process.exit(1)
})
