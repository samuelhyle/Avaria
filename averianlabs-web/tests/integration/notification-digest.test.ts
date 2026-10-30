import { emailOutbox, notificationPreferences, notifications, users } from "@/db/schema"
import { db } from "@/lib/db"
import { sendNotificationDigests } from "@/lib/notifications/digest"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"

/**
 * The email digest.
 *
 * The account settings offered an "email digest" switch that nothing acted on.
 * These tests cover the behaviour the switch now has: it sends what was
 * missed, it does not repeat itself, and it stays quiet until a notification
 * is a day old.
 */

function requireIsolatedDatabase() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "http://invalid")
  if (
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/averian_reliability", "/build"].includes(url.pathname)
  )
    throw new Error("isolated database required")
}

async function setup(email: string, digest: boolean, ageHours: number) {
  const id = crypto.randomUUID()
  await db.insert(users).values({ id, email, role: "customer" })
  await db.insert(notificationPreferences).values({ userId: id, emailDigest: digest })
  const createdAt = new Date(Date.now() - ageHours * 60 * 60_000)
  const [row] = await db
    .insert(notifications)
    .values({
      userId: id,
      kind: "reply",
      targetType: "thread",
      targetTitle: "A thread somebody replied to",
      preview: "The reply text",
      createdAt,
    })
    .returning({ id: notifications.id })
  return { userId: id, notificationId: row.id, email }
}

async function cleanup(userId: string, email: string) {
  await db.delete(emailOutbox).where(eq(emailOutbox.recipient, email))
  await db.delete(notifications).where(eq(notifications.userId, userId))
  await db.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId))
  await db.delete(users).where(eq(users.id, userId))
}

/**
 * The digest scans every customer who asked for one, so it can enqueue mail
 * for accounts other suites created. Whatever it caused is removed here, so the
 * delivery assertions in another suite see a clean outbox.
 */
async function cleanupEnqueued(before: string[]) {
  const rows = await db.select({ id: emailOutbox.id }).from(emailOutbox)
  for (const row of rows)
    if (!before.includes(row.id)) await db.delete(emailOutbox).where(eq(emailOutbox.id, row.id))
}

async function outboxIds(): Promise<string[]> {
  const rows = await db.select({ id: emailOutbox.id }).from(emailOutbox)
  return rows.map((row) => row.id)
}

it("sends the notifications a customer did not open", async () => {
  requireIsolatedDatabase()
  const email = "digest-qa@example.invalid"
  const fixture = await setup(email, true, 48)
  const before = await outboxIds()
  try {
    const result = await sendNotificationDigests()
    expect(result.sent).toBe(1)
    expect(result.notifications).toBe(1)

    const mail = await db.select().from(emailOutbox).where(eq(emailOutbox.recipient, email))
    expect(mail).toHaveLength(1)
    expect(mail[0].subject).toMatch(/notification/i)
    expect(mail[0].html).toContain("A thread somebody replied to")
  } finally {
    await cleanup(fixture.userId, email)
    await cleanupEnqueued(before)
  }
})

it("does not send the same notification twice", async () => {
  requireIsolatedDatabase()
  const email = "digest-once-qa@example.invalid"
  const fixture = await setup(email, true, 48)
  const before = await outboxIds()
  try {
    await sendNotificationDigests()
    const second = await sendNotificationDigests()
    expect(second.sent).toBe(0)
    expect(second.notifications).toBe(0)
    const mail = await db.select().from(emailOutbox).where(eq(emailOutbox.recipient, email))
    expect(mail).toHaveLength(1)
  } finally {
    await cleanup(fixture.userId, email)
    await cleanupEnqueued(before)
  }
})

it("stays quiet for a notification that is not yet a day old", async () => {
  requireIsolatedDatabase()
  const email = "digest-fresh-qa@example.invalid"
  const fixture = await setup(email, true, 2)
  const before = await outboxIds()
  try {
    const before = await outboxIds()
    const result = await sendNotificationDigests()
    expect(result.sent).toBe(0)
    const mail = await db.select().from(emailOutbox).where(eq(emailOutbox.recipient, email))
    expect(mail).toHaveLength(0)
  } finally {
    await cleanup(fixture.userId, email)
    await cleanupEnqueued(before)
  }
})

it("stays quiet when the customer turned the digest off", async () => {
  requireIsolatedDatabase()
  const email = "digest-off-qa@example.invalid"
  const fixture = await setup(email, false, 48)
  const before = await outboxIds()
  try {
    const before = await outboxIds()
    const result = await sendNotificationDigests()
    expect(result.sent).toBe(0)
    const mail = await db.select().from(emailOutbox).where(eq(emailOutbox.recipient, email))
    expect(mail).toHaveLength(0)
  } finally {
    await cleanup(fixture.userId, email)
    await cleanupEnqueued(before)
  }
})
