import {
  accounts,
  activityEvents,
  addresses,
  forumDrafts,
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
  rewardsAccounts,
  savedCalculations,
  sessions,
  users,
} from "@/db/schema"
import { aiConversations, aiMessages, supportTickets, userMemories } from "@/db/schema/ai"
import { requireMember } from "@/lib/community/auth"
/** Account deletion immediately revokes access and removes private content. */
import { db } from "@/lib/db"
import { and, desc, eq, inArray, isNotNull, lte } from "drizzle-orm"

const CLEANUP_DAYS = 30

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
    savedCalculations: await db
      .select()
      .from(savedCalculations)
      .where(eq(savedCalculations.ownerId, userId)),
    forumDrafts: await db.select().from(forumDrafts).where(eq(forumDrafts.ownerId, userId)),
  }
}

/** Irreversible removal of account credentials and private content. Orders are retained separately. */
export async function softDeleteUser(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update")
    if (!user || user.deletedAt) return
    await tx
      .update(users)
      .set({
        deletedAt: new Date(),
        email: `${userId}@deleted.invalid`,
        emailVerifiedAt: null,
        name: null,
        image: null,
        passwordHash: null,
      })
      .where(eq(users.id, userId))
    await tx.delete(savedCalculations).where(eq(savedCalculations.ownerId, userId))
    await tx.delete(forumDrafts).where(eq(forumDrafts.ownerId, userId))
    await tx
      .delete(forumThreads)
      .where(and(eq(forumThreads.authorId, userId), eq(forumThreads.status, "pending")))
    await tx
      .delete(forumPosts)
      .where(and(eq(forumPosts.authorId, userId), eq(forumPosts.status, "pending")))
    await tx.update(forumThreads).set({ authorId: null }).where(eq(forumThreads.authorId, userId))
    await tx.update(forumPosts).set({ authorId: null }).where(eq(forumPosts.authorId, userId))
    await tx.delete(forumReactions).where(eq(forumReactions.userId, userId))
    await tx.delete(sessions).where(eq(sessions.userId, userId))
    await tx.delete(accounts).where(eq(accounts.userId, userId))
    await tx.delete(passkeys).where(eq(passkeys.userId, userId))
    await tx.delete(notifications).where(eq(notifications.userId, userId))
    await tx.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId))
    await tx.delete(userMemories).where(eq(userMemories.userId, userId))
    await tx.delete(aiConversations).where(eq(aiConversations.userId, userId))
    await tx
      .update(activityEvents)
      .set({ actorId: null, actorName: null })
      .where(eq(activityEvents.actorId, userId))
    await tx
      .delete(activityEvents)
      .where(
        and(
          eq(activityEvents.targetType, "plan"),
          inArray(
            activityEvents.targetId,
            tx
              .select({ id: researchPlans.id })
              .from(researchPlans)
              .where(eq(researchPlans.ownerId, userId)),
          ),
        ),
      )
    await tx.delete(researchPlans).where(eq(researchPlans.ownerId, userId))
    const orderAddresses = await tx
      .select({ shipping: orders.shippingAddressId, billing: orders.billingAddressId })
      .from(orders)
      .where(eq(orders.userId, userId))
    const retainedIds = orderAddresses
      .flatMap((row) => [row.shipping, row.billing])
      .filter((id): id is string => Boolean(id))
    const personalAddresses = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, userId))
    const unusedIds = personalAddresses
      .map((row) => row.id)
      .filter((id) => !retainedIds.includes(id))
    if (unusedIds.length) await tx.delete(addresses).where(inArray(addresses.id, unusedIds))
    await tx.update(addresses).set({ userId: null }).where(eq(addresses.userId, userId))
  })
}

/** Remove disabled account shells after 30 days without deleting purchase records. */
export async function purgeDeletedUsers(now = new Date()): Promise<number> {
  return db.transaction(async (tx) => {
    const cutoff = new Date(now.getTime() - CLEANUP_DAYS * 86400000)
    const rows = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(isNotNull(users.deletedAt), lte(users.deletedAt, cutoff)))
      .limit(100)
      .for("update", { skipLocked: true })
    const ids = rows.map((row) => row.id)
    if (!ids.length) return 0
    await tx.update(orders).set({ userId: null }).where(inArray(orders.userId, ids))
    await tx
      .update(rewardsAccounts)
      .set({ referredBy: null })
      .where(inArray(rewardsAccounts.referredBy, ids))
    await tx.update(supportTickets).set({ userId: null }).where(inArray(supportTickets.userId, ids))
    await tx.delete(users).where(inArray(users.id, ids))
    return ids.length
  })
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
