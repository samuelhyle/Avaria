import { createHash } from "node:crypto"
import { getStore } from "@netlify/blobs"
import postgres from "postgres"
import {
  adoptBaseline,
  compareBaseline,
  inspectSchema,
  originalBaseline,
} from "../../../scripts/legacy-baseline.mjs"

export async function onPreBuild() {
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
      for (const table of new Set(schema.columns.map((c) => c.table_name))) {
        // Keep the server-produced JSON text intact: bigint/numeric and timestamp precision are preserved.
        const [{ data }] =
          await tx`select coalesce(json_agg(t), '[]'::json)::text as data from ${tx(table)} t`
        tables[table] = data
      }
      return JSON.stringify({
        version: 1,
        createdAt: new Date().toISOString(),
        deployId: process.env.DEPLOY_ID,
        schema,
        tables,
        migrations,
      })
    })
    const digest = createHash("sha256").update(backup).digest("hex")
    const key = `${process.env.DEPLOY_ID}/pre-migration.json`
    // Site-wide private storage, persisted across deploys; never an asset in the public publish directory.
    const store = getStore({
      name: "database-release-backups",
      region: "eu-central-1",
      consistency: "strong",
    })
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
