// Run only in the hosted build, where Netlify supplies the actual site secrets.
import { spawn } from "node:child_process"
import { getDeployStore } from "@netlify/blobs"
import postgres from "postgres"

const STEP = {
  install: 10,
  env: 11,
  preflight: 12,
  migrate: 13,
  seed: 14,
  fixture: 15,
  build: 16,
  bundle: 17,
  traces: 18,
}

/**
 * The build's own record of itself.
 *
 * A hosted build that fails says only "the build script returned a non-zero
 * exit code", which names the step and nothing else. The log is written to
 * private, deployment-scoped storage as the build runs, so the failing step
 * and its output can be read afterwards without asking the log service for a
 * log it does not keep.
 */
const steps = []
let captured = ""
const store = process.env.NETLIFY ? getDeployStore({ consistency: "strong" }) : null

async function publish() {
  if (!store) return
  try {
    await store.set(
      "build-diagnostics/last-run.json",
      JSON.stringify(
        {
          deployId: process.env.DEPLOY_ID ?? null,
          commit: process.env.COMMIT_REF ?? null,
          branch: process.env.BRANCH ?? null,
          finishedAt: new Date().toISOString(),
          steps,
          log: captured.slice(-60000),
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.error("[deploy] The build record could not be written:", error)
  }
}

/**
 * Run one step.
 *
 * The output is streamed as it arrives, because a build that goes quiet for
 * too long is killed by the host, and it is captured at the same time so the
 * record holds what the step printed.
 */
async function run(command, args, env = process.env, code = 1) {
  const label = `${command} ${args.join(" ")}`
  const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] })
  child.stdout.on("data", (chunk) => {
    captured += chunk
    process.stdout.write(chunk)
  })
  child.stderr.on("data", (chunk) => {
    captured += chunk
    process.stderr.write(chunk)
  })
  const status = await new Promise((resolve, reject) => {
    child.on("error", reject)
    child.on("close", (code) => resolve(code ?? 1))
  })
  steps.push({ step: label, status, at: new Date().toISOString() })
  if (status !== 0) {
    console.error(`[deploy] Step failed: ${label}`)
    await publish()
    process.exit(code)
  }
  await publish()
}

await run("pnpm", ["install", "--frozen-lockfile"], process.env, STEP.install)
await run("pnpm", ["env:check"], process.env, STEP.env)
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
await run("pnpm", ["db:migrate"], migrationEnv, STEP.migrate)
// The seed inserts missing draft reference records and never overwrites existing records.
await run("pnpm", ["db:seed"], migrationEnv, STEP.seed)
if (process.env.CHECKOUT_TEST_PRODUCT_ENABLED === "true")
  await run(
    "pnpm",
    ["exec", "tsx", "scripts/seed-checkout-test-product.ts"],
    migrationEnv,
    STEP.fixture,
  )
await run("pnpm", ["build"], process.env, STEP.build)
await run("pnpm", ["check:bundle"], process.env, STEP.bundle)
await run("node", ["scripts/check-server-traces.mjs"], process.env, STEP.traces)
await publish()
console.log("[deploy] The build finished; every step passed.")
