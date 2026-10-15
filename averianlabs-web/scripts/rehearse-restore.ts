/** Restore a private release snapshot into a NEW, EMPTY, local scratch database only. */
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const target = process.env.RESTORE_TEST_DATABASE_URL
const source = process.env.RESTORE_SNAPSHOT_PATH
const expectedHash = process.env.RESTORE_SNAPSHOT_SHA256
assert(target && source && expectedHash, "Explicit scratch database, snapshot and SHA-256 required")
const url = new URL(target)
assert(
  ["postgres:", "postgresql:"].includes(url.protocol) &&
    ["127.0.0.1", "localhost"].includes(url.hostname) &&
    /^\/averian_restore_rehearsal_[a-z0-9_]+$/.test(url.pathname),
  "Restore target must be a dedicated local averian_restore_rehearsal_* database",
)
const bytes = await readFile(source)
const hash = createHash("sha256").update(bytes).digest("hex")
assert.equal(hash, expectedHash, "Snapshot checksum mismatch")
const snapshot = JSON.parse(bytes.toString("utf8"))
assert.equal(snapshot.version, 1)
assert(snapshot.schema?.columns?.length && snapshot.migrations?.length && snapshot.tables)
const sql = postgres(target, { max: 1, prepare: false })
const quoteIdentifier = (name: string) => `"${name.replaceAll('"', '""')}"`
try {
  const counts = await sql`
    select count(*)::integer as count from information_schema.tables
    where table_schema not in ('pg_catalog', 'information_schema') and table_type = 'BASE TABLE'
  `
  assert.equal(
    counts[0]?.count,
    0,
    "Scratch database must be empty; existing data is never overwritten",
  )
  await migrate(drizzle(sql), { migrationsFolder: "db/migrations" })
  const ledger = await sql`select hash from drizzle.__drizzle_migrations order by created_at`
  assert.deepEqual(
    ledger.map((row) => row.hash),
    snapshot.migrations.map((row: { hash: string }) => row.hash),
    "Source snapshot and checked-out migrations must match before data import",
  )
  const schema = await sql`
    select table_name, column_name, udt_name, is_generated
    from information_schema.columns where table_schema = 'public'
  `
  const tableNames = [...new Set(schema.map((column) => column.table_name))].sort()
  assert.deepEqual(
    tableNames,
    Object.keys(snapshot.tables).sort(),
    "Snapshot table coverage mismatch",
  )
  for (const table of tableNames) {
    const actual = schema.filter((column) => column.table_name === table).map((c) => c.column_name)
    const expected = snapshot.schema.columns
      .filter((column: { table_name: string }) => column.table_name === table)
      .map((column: { column_name: string }) => column.column_name)
    assert.deepEqual(actual.sort(), expected.sort(), `Column coverage mismatch: ${table}`)
  }
  const restored = await sql.begin(async (tx) => {
    // Remove only foreign keys in this empty scratch database. Re-add and validate
    // every one after loading, including cycles between products and assigned vials.
    const foreignKeys = await tx`
      select c.relname as table_name, co.conname as name,
        pg_get_constraintdef(co.oid) as definition
      from pg_constraint co join pg_class c on c.oid = co.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and co.contype = 'f'
    `
    for (const key of foreignKeys)
      await tx`alter table ${tx(key.table_name)} drop constraint ${tx(key.name)}`
    const results = []
    for (const table of tableNames) {
      const serialized = snapshot.tables[table]
      const rows = typeof serialized === "string" ? JSON.parse(serialized) : serialized
      assert(Array.isArray(rows), `Invalid snapshot rows: ${table}`)
      const columns = schema
        .filter((column) => column.table_name === table && column.is_generated === "NEVER")
        .map((column) => column.column_name)
      const rowJson = JSON.stringify(rows)
      if (rows.length)
        await tx`
          insert into ${tx(table)} (${tx(columns)})
          select ${tx(columns)} from jsonb_populate_recordset(null::${tx(table)}, ${rowJson}::jsonb)
        `
      const counts = await tx`select count(*)::integer as count from ${tx(table)}`
      const actual = counts[0]?.count
      assert.equal(actual, rows.length, `Restored row count mismatch: ${table}`)
      const differences = await tx`
        select count(*)::integer as differences from (
          (select ${tx(columns)} from ${tx(table)}
           except all select ${tx(columns)} from jsonb_populate_recordset(null::${tx(table)}, ${rowJson}::jsonb))
          union all
          (select ${tx(columns)} from jsonb_populate_recordset(null::${tx(table)}, ${rowJson}::jsonb)
           except all select ${tx(columns)} from ${tx(table)})
        ) changes
      `
      assert.equal(differences[0]?.differences, 0, `Restored values differ: ${table}`)
      results.push({ table, rows: actual, valuesMatched: true })
    }
    for (const key of foreignKeys)
      await tx.unsafe(
        `alter table ${quoteIdentifier(key.table_name)} add constraint ${quoteIdentifier(key.name)} ${key.definition}`,
      )
    return { tables: results, validatedForeignKeys: foreignKeys.length }
  })
  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        scope:
          "Private application logical snapshot restored into empty local PostgreSQL/pgvector. No hosted database writes; not a provider PITR or full-cluster recovery test.",
        snapshotDeployId: snapshot.deployId,
        snapshotSha256: hash,
        migrationHashesMatched: ledger.length,
        publicTables: restored.tables.length,
        restoredRows: restored.tables.reduce((sum, row) => sum + row.rows, 0),
        validatedForeignKeys: restored.validatedForeignKeys,
        allValuesMatched: restored.tables.every((row) => row.valuesMatched),
        state: "passed",
      },
      null,
      2,
    ),
  )
} finally {
  await sql.end()
}
