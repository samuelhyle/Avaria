import * as schema from "@/db/schema"
import { getServerEnv } from "@/lib/env"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

declare global {
  // eslint-disable-next-line no-var
  var __averianlabsPg: ReturnType<typeof postgres> | undefined
}

// Throws in production when DATABASE_URL is missing or malformed.
const env = getServerEnv()
const url = env.DATABASE_URL

// Neon/pgBouncer pooled endpoints run in transaction mode, which does not
// support session-level prepared statements. Serverless instances also must
// keep their connection count tiny. Direct connections can hold a real pool.
const isPooled = Boolean(url && (url.includes("-pooler") || url.includes("pgbouncer")))

const clientConfig = isPooled
  ? { max: 1, idle_timeout: 20, max_lifetime: 60 * 30, connect_timeout: 10, prepare: false }
  : { max: 10, idle_timeout: 30, max_lifetime: 60 * 30, connect_timeout: 10 }

const client =
  globalThis.__averianlabsPg ??
  (url ? postgres(url, clientConfig) : (postgres("", { max: 0 }) as ReturnType<typeof postgres>))

if (process.env.NODE_ENV !== "production") {
  globalThis.__averianlabsPg = client
}

export const db = drizzle(client, { schema })
export { schema }
