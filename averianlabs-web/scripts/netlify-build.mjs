// Run only in the hosted build, where Netlify supplies the actual site secrets.
import { spawnSync } from "node:child_process"
import postgres from "postgres"

/**
 * The exit code names the step that failed.
 *
 * The host reports a failed build as "Build script returned non-zero exit
 * code: N" and the log is not readable through the API, so the number is
 * the only thing that survives the build. Each step therefore exits with
 * its own code, and the table is in the release record.
 */
const STEP = {
  env: 11,
  preflight: 12,
  migrate: 13,
  seed: 14,
  fixture: 15,
  typecheck: 16,
  lint: 17,
  test: 18,
  build: 19,
  bundle: 20,
  traces: 21,
}

function run(command, args, env = process.env, code = 1) {
  const result = spawnSync(command, args, { stdio: "inherit", env })
  if (result.error) throw result.error
  if (result.status !== 0) {
    console.error(`[deploy] Step failed: ${command} ${args.join(" ")}`)
    process.exit(code)
  }
}

run("pnpm", ["env:check"], process.env, STEP.env)
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
} catch (error) {
  console.error(
    "[deploy] Database preflight failed:",
    error instanceof Error ? error.message : error,
  )
  process.exit(STEP.preflight)
} finally {
  await sql.end()
}

const migrationEnv = { ...process.env, DATABASE_URL: migrationUrl }
run("pnpm", ["db:migrate"], migrationEnv, STEP.migrate)
// The seed inserts missing draft reference records and never overwrites existing records.
run("pnpm", ["db:seed"], migrationEnv, STEP.seed)
if (process.env.CHECKOUT_TEST_PRODUCT_ENABLED === "true")
  run("pnpm", ["exec", "tsx", "scripts/seed-checkout-test-product.ts"], migrationEnv, STEP.fixture)
// The checks that gate the release.
//
// The GitHub workflow cannot be pushed from this machine — the push
// credential carries no `workflow` scope, so GitHub refuses any commit that
// creates or updates a file under `.github/workflows/`. Rather than ship
// without a gate, the gate runs in the build that publishes the site: every
// deploy is type-checked, linted and unit-tested before it is built, so a
// broken commit cannot reach the public site.
//
// The integration suite is not part of this gate. It needs a writable
// database of its own and the payment provider's credentials, and two of its
// cases are expected to fail without them. It runs locally against the
// isolated database.
run("pnpm", ["typecheck"], process.env, STEP.typecheck)
run("pnpm", ["lint"], process.env, STEP.lint)
// The suite runs with NODE_ENV=test whatever the host set.
//
// The host sets NODE_ENV=production for the whole build, and React's
// production build does not export `act` — the test-only helper that renders
// a component and lets its effects settle. Ten suites import it from
// `react`, so under NODE_ENV=production they fail with "act is not a
// function" before they run a single assertion.
//
// NODE_ENV=test keeps React's development build, which is the build the
// suite was written against. The production build is verified separately:
// the browser suite runs against a real deployment, and the build itself
// type-checks and bundles the production output.
run("pnpm", ["test"], { ...process.env, NODE_ENV: "test" }, STEP.test)
run("pnpm", ["build"], process.env, STEP.build)
run("pnpm", ["check:bundle"], process.env, STEP.bundle)
run("node", ["scripts/check-server-traces.mjs"], process.env, STEP.traces)
