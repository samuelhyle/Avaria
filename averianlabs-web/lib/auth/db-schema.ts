import { sessions, verificationTokens } from "@/db/schema"
import { sql } from "drizzle-orm"
import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"

/**
 * Auth.js' Drizzle adapter expects a `users.emailVerified` column, while the
 * application schema names it `users.emailVerifiedAt`. This adapter-only table
 * maps the expected property onto the physical column so OAuth flows work
 * without a second migration.
 */
export const authUsers = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("email_verified_at", { withTimezone: true, mode: "date" }),
  image: text("image"),
})

/**
 * The adapter's default schema uses snake_case property names for the accounts
 * table; the application schema uses camelCase properties over the same
 * physical columns.
 */
export const authAccounts = pgTable(
  "accounts",
  {
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
)

export const authAdapterSchema = {
  usersTable: authUsers,
  accountsTable: authAccounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
}
