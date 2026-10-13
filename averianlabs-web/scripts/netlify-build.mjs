// Run only in the hosted build, where Netlify supplies the actual site secrets.
import { spawnSync } from "node:child_process"
import postgres from "postgres"

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", env })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run("pnpm", ["env:check"])
if (process.env.BUILD_MODE === "demo") {
  throw new Error("The hosted site requires the full application runtime")
}

const migrationUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
const sql = postgres(migrationUrl, { max: 1, prepare: false, connect_timeout: 15 })
try {
  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `
  const [{ ledger }] = await sql`select to_regclass('drizzle.__drizzle_migrations') as ledger`
  console.log(
    `[deploy] Database preflight: ${tables.length} public tables; migration ledger ${ledger ? "present" : "absent"}`,
  )
  if (tables.length && !ledger) {
    throw new Error(
      "Existing database has no migration ledger. Baseline it explicitly before deployment; never reset it automatically.",
    )
  }
  if (ledger) {
    const entries = await sql`select id, created_at from drizzle.__drizzle_migrations order by id`
    console.log(
      "[deploy] Applied migration timestamps:",
      entries.map((e) => String(e.created_at)).join(", "),
    )
  }
  for (const table of ["users", "orders", "products"]) {
    if (tables.some((t) => t.table_name === table)) {
      const [{ count }] = await sql`select count(*)::integer as count from ${sql(table)}`
      console.log(`[deploy] ${table}: ${count} existing records`)
    }
  }
} finally {
  await sql.end()
}

const migrationEnv = { ...process.env, DATABASE_URL: migrationUrl }
run("pnpm", ["db:migrate"], migrationEnv)
// The seed inserts missing draft reference records and never overwrites existing records.
run("pnpm", ["db:seed"], migrationEnv)
run("pnpm", ["build"])
run("pnpm", ["check:bundle"])
