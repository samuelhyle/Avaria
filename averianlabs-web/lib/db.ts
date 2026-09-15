import * as schema from "@/db/schema"
import { getServerEnv } from "@/lib/env"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

declare global {
  // eslint-disable-next-line no-var
  var __averianlabsPg: ReturnType<typeof postgres> | undefined
}

// `next build` evaluates server modules before the runtime env is injected.
// Relax required env vars during the build phase so pre-rendering can run.
const isDemoBuild = process.env.BUILD_MODE === "demo"

function buildClient(): ReturnType<typeof postgres> {
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

  // In demo mode we hand back a Postgres client pointed at an obviously
  // unreachable address. The client is created lazily (no socket yet) and
  // any query that actually tries to use it will fail loudly with a
  // connection error — preferable to silent hangs.
  if (!url) {
    if (isDemoBuild) {
      return postgres("postgres://demo:disabled@127.0.0.1:1/demo", {
        max: 0,
        connect_timeout: 1,
      })
    }
    return postgres("", { max: 0 })
  }

  return postgres(url, clientConfig)
}

const client =
  globalThis.__averianlabsPg ?? buildClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.__averianlabsPg = client
}

export const db = drizzle(client, { schema })
export { schema }