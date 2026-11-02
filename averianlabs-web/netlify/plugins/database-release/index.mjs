import { createHash } from "node:crypto"
import { getDeployStore } from "@netlify/blobs"
import postgres from "postgres"
import {
  adoptBaseline,
  compareBaseline,
  inspectSchema,
  originalBaseline,
} from "../../../scripts/legacy-baseline.mjs"

/**
 * Take the pre-migration backup.
 *
 * This runs as a named step of the build script rather than as a plugin
 * hook. A plugin failure is reported by the host as a bare exit code with
 * no name; a step failure carries the step's own code, and the build log
 * says what went wrong.
 */
export async function prepareDatabaseRelease() {
  if (!process.env.NETLIFY || !process.env.DEPLOY_ID)
    throw new Error("Database release preparation requires a hosted Netlify build")
  const sql = postgres(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
  })
  try {
    const baseline = await originalBaseline()
    let needsBaseline = false
    const backup = await sql.begin("isolation level repeatable read read only", async (tx) => {
      const schema = await inspectSchema(tx)
      console.log(
        "[deploy] Existing embedding column type:",
        schema.columns.find(
          (c) => c.table_name === "ai_document_chunks" && c.column_name === "embedding",
        )?.type ?? "absent",
      )
      const [{ ledger }] = await tx`select to_regclass('drizzle.__drizzle_migrations') as ledger`
      const migrations = ledger
        ? await tx`select * from drizzle.__drizzle_migrations order by id`
        : []
      needsBaseline = !migrations.length && schema.columns.length > 0
      if (needsBaseline) {
        const differences = compareBaseline(baseline.snapshot, schema)
        if (differences.length)
          throw new Error(`Original schema does not match: ${differences.slice(0, 12).join("; ")}`)
      }
      const tables = {}
      const counts = {}
      const omitted = []
      // The precious tables are backed up in full, in this order, whatever
      // else the database has collected since the last release.
      const PRECIOUS = [
        "users",
        "accounts",
        "addresses",
        "passkeys",
        "products",
        "product_translations",
        "categories",
        "vials",
        "batches",
        "coa_tests",
        "documents",
        "orders",
        "order_items",
        "shipments",
        "inventory_reservations",
        "quote_requests",
        "support_tickets",
        "crypto_checkout_sessions",
        "crypto_deposits",
        "promotions",
        "promotion_redemptions",
        "research_plans",
        "research_plan_items",
        "webhook_events",
        "gdpr_requests",
        "partner_applications",
        "newsletter_subscribers",
        "rewards_accounts",
        "referral_redemptions",
        "forum_threads",
        "forum_posts",
        "forum_reactions",
        "forum_categories",
        "saved_calculations",
      ]
      const all = [...new Set(schema.columns.map((c) => c.table_name))]
      const ordered = [
        ...PRECIOUS.filter((table) => all.includes(table)),
        ...all.filter((table) => !PRECIOUS.includes(table)).sort(),
      ]
      // A budget for the whole backup. The store that holds it is finite, and
      // a database that grows quietly — a search index that is rebuilt every
      // five minutes, a delivery queue that never drains — can fill it and
      // stop every build from succeeding. The precious tables are backed up
      // first and in full; the rest are backed up while there is room, and
      // recorded by row count when there is not.
      const BUDGET = 24 * 1024 * 1024
      let used = 0
      for (const table of ordered) {
        try {
          const [{ count }] = await tx`select count(*)::integer as count from ${tx(table)} t`
          counts[table] = count
        } catch {
          counts[table] = null
        }
        const precious = PRECIOUS.includes(table)
        if (!precious && used >= BUDGET) {
          omitted.push(table)
          continue
        }
        let data
        try {
          // Keep the server-produced JSON text intact: bigint/numeric and timestamp precision are preserved.
          const [row] =
            await tx`select coalesce(json_agg(t), '[]'::json)::text as data from ${tx(table)} t`
          data = row.data
        } catch (error) {
          // A column that JSON cannot represent must not stop the release.
          // The table is recorded as omitted so the record stays honest.
          console.error(
            `[deploy] Table ${table} could not be serialised:`,
            error instanceof Error ? error.message : String(error),
          )
          omitted.push(table)
          continue
        }
        used += data.length
        tables[table] = data
      }
      const summary = `[deploy] Backup: ${Object.keys(tables).length} tables in full (${(used / 1024 / 1024).toFixed(2)} MiB)`
      console.log(
        omitted.length
          ? `${summary}; ${omitted.length} table(s) recorded by row count only: ${omitted.join(", ")}`
          : summary,
      )
      return JSON.stringify({
        version: 2,
        createdAt: new Date().toISOString(),
        deployId: process.env.DEPLOY_ID,
        schema,
        tables,
        counts,
        omitted,
        migrations,
      })
    })
    const digest = createHash("sha256").update(backup).digest("hex")
    const key = "database-release-backups/pre-migration.json"
    // Private deployment-scoped storage, never a public publish asset.
    // Export this backup before deleting the associated deployment.
    const store = getDeployStore({ consistency: "strong" })
    await store.set(key, backup, { metadata: { sha256: digest } })
    const saved = await store.get(key, { type: "text", consistency: "strong" })
    if (saved === null || createHash("sha256").update(saved).digest("hex") !== digest)
      throw new Error("Private database backup could not be verified; migration stopped")
    console.log(`[deploy] Private pre-migration backup verified: ${key}; SHA-256 ${digest}`)
    if (needsBaseline) await adoptBaseline(sql, baseline)
  } finally {
    await sql.end()
  }
}

/** Kept for the plugin entry point; the build script calls the function above. */
export async function onPreBuild() {
  await prepareDatabaseRelease()
}
