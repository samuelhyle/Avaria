/**
 * In-app notification service.
 *
 * `emitNotification()` is fire-and-forget. The user gets a row in
 * `notifications`; the bell icon in the header reads from this table.
 */

import { notificationPreferences, notifications } from "@/db/schema"
import { db } from "@/lib/db"
import { and, desc, eq, isNull, sql } from "drizzle-orm"

export type NotificationKind = "reply" | "reaction" | "mention" | "system" | "plan_shared"

export interface EmitInput {
  userId: string
  kind: NotificationKind
  actorId?: string | null
  actorName?: string | null
  targetType?: "thread" | "post" | "plan" | "product"
  targetId?: string | null
  targetSlug?: string | null
  targetTitle?: string | null
  preview?: string
}

const KIND_DEFAULT_PREFS: Record<
  NotificationKind,
  keyof typeof notificationPreferences.$inferInsert
> = {
  reply: "replyEnabled",
  reaction: "reactionEnabled",
  mention: "mentionEnabled",
  plan_shared: "planSharedEnabled",
  system: "replyEnabled",
}

export function emitNotification(input: EmitInput): void {
  void (async () => {
    try {
      const prefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, input.userId))
        .limit(1)
      const prefRow = prefs[0]
      const prefKey = KIND_DEFAULT_PREFS[input.kind]
      if (prefRow && prefRow[prefKey] === false) return
      // Skip self-notifications (don't notify yourself of your own action)
      if (input.actorId && input.actorId === input.userId) return

      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        kind: input.kind,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        targetSlug: input.targetSlug ?? null,
        targetTitle: input.targetTitle ?? null,
        preview: input.preview?.slice(0, 240) ?? null,
      })
    } catch {
      // best-effort
    }
  })().catch(() => {})
}

export async function listUnreadNotifications(userId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
  return rows[0]?.c ?? 0
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const now = new Date()
  if (!ids || ids.length === 0) {
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
  } else {
    for (const id of ids) {
      await db
        .update(notifications)
        .set({ readAt: now })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    }
  }
}

export async function getOrCreatePreferences(userId: string) {
  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1)
  if (existing[0]) return existing[0]
  const inserted = await db.insert(notificationPreferences).values({ userId }).returning()
  return inserted[0]!
}

export async function updatePreferences(
  userId: string,
  patch: Partial<{
    replyEnabled: boolean
    reactionEnabled: boolean
    mentionEnabled: boolean
    planSharedEnabled: boolean
    emailDigest: boolean
  }>,
) {
  const existing = await getOrCreatePreferences(userId)
  await db
    .update(notificationPreferences)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(notificationPreferences.userId, userId))
  return { ...existing, ...patch }
}
