/**
 * Audit log helper — append-only record of every admin action.
 *
 * Use from API routes that perform privileged operations:
 *
 *   import { logAudit } from "@/lib/audit/log";
 *   await logAudit({
 *     actor: member,
 *     action: "moderation.verdict",
 *     entity: "forumModerationEvent",
 *     entityId: eventId,
 *     metadata: { verdict: "remove" },
 *   });
 */

import { auditLog } from "@/db/schema"
import type { ForumRole } from "@/lib/community"
import { db } from "@/lib/db"
import { and, desc, eq } from "drizzle-orm"

/**
 * Minimal actor shape the audit log accepts. Use this anywhere — you don't
 * need to construct a full AdminMember just to log.
 */
export interface AuditActor {
  id: string
  email: string
  role?: ForumRole
  reputation?: number
}

export interface AuditEntry {
  actor: AuditActor
  action: string // dot-separated verb: "moderation.verdict", "document.create"
  entity: string // table/object name: "forumModerationEvent", "documents"
  entityId?: string
  metadata?: Record<string, unknown>
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: entry.actor.id,
      actorEmail: entry.actor.email,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
    })
  } catch {
    // audit log is best-effort; never crash the caller's request path
  }
}

export async function listAuditEvents(
  opts: { limit?: number; actorId?: string; entity?: string } = {},
) {
  const limit = Math.min(opts.limit ?? 100, 500)
  const conditions = [] as ReturnType<typeof eq>[]
  if (opts.actorId) conditions.push(eq(auditLog.actorId, opts.actorId))
  if (opts.entity) conditions.push(eq(auditLog.entity, opts.entity))

  return db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      actorEmail: auditLog.actorEmail,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
}
