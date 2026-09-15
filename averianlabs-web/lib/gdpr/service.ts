import {
  accounts,
  activityEvents,
  addresses,
  forumPosts,
  forumReactions,
  forumThreads,
  gdprRequests,
  notificationPreferences,
  notifications,
  orderItems,
  orders,
  passkeys,
  researchPlanItems,
  researchPlans,
  sessions,
  users,
} from "@/db/schema"
import { aiConversations, aiMessages, supportTickets, userMemories } from "@/db/schema/ai"
import { requireMember } from "@/lib/community/auth"
/**
 * GDPR endpoints — Art. 17 (delete) + Art. 20 (export).
 *
 * Returns a JSON archive of all user-owned rows. Soft-delete sets
 * `users.deletedAt` to a future timestamp; the actual hard-delete is
 * a separate cron after 30 days.
 */
import { db } from "@/lib/db"
import { desc, eq, inArray } from "drizzle-orm"

const GRACE_DAYS = 30

export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const [
    [user],
    userOrders,
    userAddresses,
    userThreads,
    userPosts,
    userReactions,
    userPlans,
    userAccounts,
    userSessions,
    userPasskeys,
    userNotifications,
    [userPreferences],
    userActivity,
    userConversations,
    userMemoryRows,
    userTickets,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        locale: users.locale,
        emailVerifiedAt: users.emailVerifiedAt,
        reputation: users.reputation,
        reputationTier: users.reputationTier,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.placedAt)),
    db.select().from(addresses).where(eq(addresses.userId, userId)),
    db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.authorId, userId))
      .orderBy(desc(forumThreads.createdAt)),
    db
      .select()
      .from(forumPosts)
      .where(eq(forumPosts.authorId, userId))
      .orderBy(desc(forumPosts.createdAt)),
    db.select().from(forumReactions).where(eq(forumReactions.userId, userId)),
    db.select().from(researchPlans).where(eq(researchPlans.ownerId, userId)),
    // Credential material (tokens) is intentionally excluded from the export.
    db
      .select({
        type: accounts.type,
        provider: accounts.provider,
        providerAccountId: accounts.providerAccountId,
        scope: accounts.scope,
      })
      .from(accounts)
      .where(eq(accounts.userId, userId)),
    db.select({ expires: sessions.expires }).from(sessions).where(eq(sessions.userId, userId)),
    db.select({ createdAt: passkeys.createdAt }).from(passkeys).where(eq(passkeys.userId, userId)),
    db.select().from(notifications).where(eq(notifications.userId, userId)),
    db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)),
    db.select().from(activityEvents).where(eq(activityEvents.actorId, userId)),
    db.select().from(aiConversations).where(eq(aiConversations.userId, userId)),
    db.select().from(userMemories).where(eq(userMemories.userId, userId)),
    db.select().from(supportTickets).where(eq(supportTickets.userId, userId)),
  ])

  // Fetch plan items for ALL plans (not just the first one)
  const planIds = userPlans.map((p) => p.id)
  const planItems =
    planIds.length === 0
      ? []
      : await db.select().from(researchPlanItems).where(inArray(researchPlanItems.planId, planIds))

  // Fetch order items for ALL orders (not just the first one)
  const orderIds = userOrders.map((o) => o.id)
  const orderItemRows =
    orderIds.length === 0
      ? []
      : await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))

  const conversationIds = userConversations.map((c) => c.id)
  const messageRows =
    conversationIds.length === 0
      ? []
      : await db
          .select()
          .from(aiMessages)
          .where(inArray(aiMessages.conversationId, conversationIds))

  return {
    generatedAt: new Date().toISOString(),
    user: user ?? null,
    addresses: userAddresses,
    orders: userOrders,
    orderItems: orderItemRows,
    forumThreads: userThreads,
    forumPosts: userPosts,
    forumReactions: userReactions,
    researchPlans: userPlans,
    researchPlanItems: planItems,
    accounts: userAccounts,
    sessions: userSessions,
    passkeys: userPasskeys,
    notifications: userNotifications,
    notificationPreferences: userPreferences ?? null,
    activityEvents: userActivity,
    aiConversations: userConversations,
    aiMessages: messageRows,
    userMemories: userMemoryRows,
    supportTickets: userTickets,
  }
}

/**
 * Soft-delete a user. After GRACE_DAYS, a separate cron would do the hard delete.
 * Until then, personal fields are cleared and forum content is anonymised.
 */
export async function softDeleteUser(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000)
  await db
    .update(users)
    .set({ deletedAt: expiresAt, name: null, image: null, passwordHash: null })
    .where(eq(users.id, userId))

  // Anonymise forum content (preserve the conversation; remove the actor)
  await db.update(forumThreads).set({ authorId: null }).where(eq(forumThreads.authorId, userId))
  await db.update(forumPosts).set({ authorId: null }).where(eq(forumPosts.authorId, userId))
  await db.delete(forumReactions).where(eq(forumReactions.userId, userId))

  // Revoke credentials and clear personal side-data
  await db.delete(sessions).where(eq(sessions.userId, userId))
  await db.delete(accounts).where(eq(accounts.userId, userId))
  await db.delete(passkeys).where(eq(passkeys.userId, userId))
  await db.delete(notifications).where(eq(notifications.userId, userId))
  await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId))
  await db.delete(userMemories).where(eq(userMemories.userId, userId))
  await db.delete(aiConversations).where(eq(aiConversations.userId, userId))
  await db
    .update(activityEvents)
    .set({ actorId: null, actorName: null })
    .where(eq(activityEvents.actorId, userId))

  // Plans: hard delete (private data, no value after user leaves)
  await db.delete(researchPlans).where(eq(researchPlans.ownerId, userId))
}

export async function recordExportRequest(userId: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(gdprRequests).values({ id, userId, kind: "export", status: "pending" })
  return id
}

export async function recordDeleteRequest(userId: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(gdprRequests).values({ id, userId, kind: "delete", status: "pending" })
  return id
}

export async function confirmDeleteRequest(requestId: string): Promise<boolean> {
  const [request] = await db
    .select()
    .from(gdprRequests)
    .where(eq(gdprRequests.id, requestId))
    .limit(1)
  if (!request || request.status !== "pending") return false
  if (request.tokenExpiresAt && request.tokenExpiresAt.getTime() < Date.now()) return false
  await softDeleteUser(request.userId)
  await db
    .update(gdprRequests)
    .set({ status: "completed", completedAt: new Date(), token: null })
    .where(eq(gdprRequests.id, requestId))
  return true
}

export { requireMember }
