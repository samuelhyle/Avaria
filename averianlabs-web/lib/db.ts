import * as schema from "@/db/schema"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres, { type Sql } from "postgres"

declare global {
  // eslint-disable-next-line no-var
  var __averianlabsPg: ReturnType<typeof postgres> | undefined
}

// No DATABASE_URL → the client is a stub that satisfies Drizzle's lazy
// introspection (Drizzle mutates `client.options.parsers`/`.serializers` on
// every `drizzle()` call and queries properties like `client.options`),
// but throws on any actual query / transaction. The marketing/catalog/AI-chat
// surface never reaches a DB query, and DB-aware routes gate themselves with
// `isDatabaseConfigured()` and return 503 instead of crashing. (A real
// `postgres()` client pointed at an unreachable address blocks indefinitely
// on connect attempts, which would hang the chat endpoint.)
class UnconfiguredDbError extends Error {
  constructor() {
    super(
      "DATABASE_URL is not configured. Set it in the host's environment to enable DB-backed routes.",
    )
    this.name = "UnconfiguredDbError"
  }
}

const stubError = () => {
  throw new UnconfiguredDbError()
}

function buildStubClient(): Sql {
  // Drizzle mutates `client.options.parsers` / `client.options.serializers`
  // (and reads `client.options`) inside `drizzle(client, { schema })`. Provide
  // real objects so those mutations don't crash; the first query that actually
  // executes still throws the readable error above.
  const parsers: Record<string, unknown> = {}
  const serializers: Record<string, unknown> = {}
  const options = { parsers, serializers }
  const stub = {
    options,
    // Tagged-template SQL:  sql`select 1` → throws.
    // Property access: every name resolves to a throwing function.
  }
  return new Proxy(stub as unknown as Sql, {
    get(_t, prop) {
      if (typeof prop === "symbol") return undefined
      if (prop === "options") return options
      if (prop === "length" || prop === "name" || prop === "prototype") return undefined
      return stubError
    },
    apply: stubError,
    construct: stubError,
  })
}

function buildClient(): Sql {
  const url = process.env.DATABASE_URL?.trim()

  if (!url) {
    return buildStubClient()
  }

  // Neon/pgBouncer pooled endpoints run in transaction mode, which does not
  // support session-level prepared statements. Serverless instances also must
  // keep their connection count tiny. Direct connections can hold a real pool.
  const isPooled = url.includes("-pooler") || url.includes("pgbouncer")

  const clientConfig = isPooled
    ? { max: 1, idle_timeout: 20, max_lifetime: 60 * 30, connect_timeout: 10, prepare: false }
    : { max: 10, idle_timeout: 30, max_lifetime: 60 * 30, connect_timeout: 10 }

  return postgres(url, clientConfig)
}

let cachedClient: Sql | null = null

function getClient(): Sql {
  if (cachedClient) return cachedClient
  if (globalThis.__averianlabsPg) {
    cachedClient = globalThis.__averianlabsPg
    return cachedClient
  }
  const client = buildClient()
  if (process.env.NODE_ENV !== "production") {
    globalThis.__averianlabsPg = client
  }
  cachedClient = client
  return client
}

// Eagerly create the client once on first import so the rest of the app can
// import { db } without needing to remember to call a getter. The stub path
// is cheap (no I/O).
const client = getClient()

export const db: PostgresJsDatabase<typeof schema> = drizzle(client, { schema })
export { schema }

/** True when the process has a real DATABASE_URL configured. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export { UnconfiguredDbError }
