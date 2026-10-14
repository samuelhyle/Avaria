import postgres from "postgres"

export function isolatedBrowserDatabase() {
  const value = process.env.TEST_DATABASE_URL
  if (!value || value !== process.env.DATABASE_URL)
    throw new Error(
      "Browser mutations require matching isolated DATABASE_URL and TEST_DATABASE_URL",
    )
  const url = new URL(value)
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/averian_reliability", "/build"].includes(url.pathname)
  )
    throw new Error("Refusing browser fixture mutation outside the isolated local/CI database")
  return postgres(value, { max: 1 })
}

export async function cleanBrowserRecords(email: string) {
  if (!/^browser-qa-.+@example\.invalid$/.test(email))
    throw new Error("Refusing cleanup of non-fixture records")
  const sql = isolatedBrowserDatabase()
  try {
    await sql.begin(async (tx) => {
      await tx`delete from email_outbox where recipient = ${email} or reply_to = ${email}`
      await tx`delete from support_tickets where email = ${email}`
      await tx`delete from quote_requests where email = ${email}`
      await tx`delete from verification_tokens where identifier in (${`email-verify:${email}`}, ${`password-reset:${email}`}, ${`account-delete:${email}`})`
      await tx`delete from activity_events where actor_id in (select id from users where email = ${email})`
      await tx`delete from forum_moderation_events where target_id in (select p.id from forum_posts p join forum_threads t on t.id=p.thread_id join users u on u.id=t.author_id where u.email=${email}) or target_id in (select t.id from forum_threads t join users u on u.id=t.author_id where u.email=${email})`
      await tx`delete from forum_threads where author_id in (select id from users where email = ${email})`
      await tx`delete from users where email = ${email}`
    })
  } finally {
    await sql.end()
  }
}
