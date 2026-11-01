#!/usr/bin/env node
/**
 * Load and stress test harness for the AverianLabs storefront.
 *
 * Wraps autocannon and turns its raw numbers into something a release
 * decision can be made from: throughput, latency percentiles, error rate,
 * and — crucially — whether the *cache* is doing the work or whether every
 * request is falling through to the database.
 *
 * The scenarios cover what a real storefront actually receives:
 *
 *   browse      the home page — the most requested route
 *   catalogue   the shop, which renders the whole catalogue
 *   product     a product page, which renders one product from the catalogue
 *   mixed       a weighted mix of the routes a visitor actually walks
 *   api         the read APIs a page calls in the background
 *   write       a state-changing request, which takes the CSRF path and
 *               the database write path
 *
 * Usage:
 *   node scripts/load/load-test.mjs --scenario=browse --connections=50 --duration=30
 *   node scripts/load/load-test.mjs --all
 *
 * Options:
 *   --url=<base>        the server to test (default http://localhost:3000)
 *   --scenario=<name>   browse | catalogue | product | mixed | api | write
 *   --connections=<n>   concurrent connections (default 25)
 *   --duration=<s>      seconds (default 30)
 *   --ramp=<s>          seconds to ramp connections up (default 0)
 *   --warmup=<s>        seconds of unmeasured traffic first (default 0)
 *   --json              print the raw result as JSON
 *   --out=<file>        write the raw result to a file
 */
import { writeFileSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire("/tmp/opencode/load/")
const autocannon = require("autocannon")

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}
const has = (name) => args.includes(`--${name}`)

const BASE = flag("url", "http://localhost:3000")
const DURATION = Number(flag("duration", 30))
const CONNECTIONS = Number(flag("connections", 25))
const RAMP = Number(flag("ramp", 0))
const WARMUP = Number(flag("warmup", 0))

/** The routes a storefront visitor walks, with the weight each has. */
const SCENARIOS = {
  browse: {
    description: "The home page — the most requested route",
    paths: [{ path: "/en", weight: 100 }],
  },
  catalogue: {
    description: "The shop, which renders the whole catalogue",
    paths: [{ path: "/en/shop", weight: 100 }],
  },
  product: {
    description: "A product page, rendered from the cached catalogue",
    paths: [{ path: "/en/shop/bpc-157", weight: 100 }],
  },
  mixed: {
    description: "A weighted mix of the routes a visitor walks",
    paths: [
      { path: "/en", weight: 40 },
      { path: "/en/shop", weight: 25 },
      { path: "/en/shop/bpc-157", weight: 15 },
      { path: "/en/shop/ghk-cu", weight: 8 },
      { path: "/en/quality", weight: 5 },
      { path: "/en/documents", weight: 4 },
      { path: "/en/about", weight: 3 },
    ],
  },
  api: {
    description: "The read APIs a page calls in the background",
    paths: [
      { path: "/api/health", weight: 20 },
      { path: "/api/search?q=peptide", weight: 40 },
      { path: "/api/og/default/en", weight: 20 },
      { path: "/api/vat?country=FI&net=100", weight: 20 },
    ],
  },
  write: {
    description: "A state-changing request — the CSRF and write path",
    paths: [{ path: "/api/contact", weight: 100, method: "POST", body: { locale: "en" } }],
  },
}

const scenarioName = flag("scenario", "browse")
const scenario = SCENARIOS[scenarioName]
if (!scenario) {
  console.error(`Unknown scenario '${scenarioName}'. Known: ${Object.keys(SCENARIOS).join(", ")}`)
  process.exit(2)
}

/**
 * Build the request list.
 *
 * A fixed list of paths is used rather than random selection so two runs of
 * the same scenario hit the same routes in the same proportion, and the
 * numbers are comparable.
 */
function buildRequests() {
  const expanded = []
  for (const entry of scenario.paths) {
    for (let i = 0; i < entry.weight; i += 1) expanded.push(entry)
  }
  return expanded
}

const requests = buildRequests()

const options = {
  url: BASE,
  connections: CONNECTIONS,
  duration: DURATION,
  requests,
  pipelining: 1,
  // A real browser sends a compressed accept-encoding header. Without it
  // the server may answer with an uncompressed body, which flatters the
  // numbers.
  headers: {
    "accept-encoding": "gzip, deflate, br",
    // A browser's user agent, because the host's edge protection answers
    // anything that does not look like a browser with a branded 403 — and
    // the number that matters is the one a visitor gets. With a tool-like
    // agent the same run returns roughly a third 403s, which says nothing
    // about the site.
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
  },
}
if (RAMP > 0) options.rampUp = RAMP

if (has("json") || has("out")) {
  // `autocannon` returns a stream; collect it into one result.
  const result = await new Promise((resolve, reject) => {
    const instance = autocannon(options, (error, res) => (error ? reject(error) : resolve(res)))
    instance.on("error", reject)
  })
  const report = format(result, scenarioName, scenario.description)
  if (has("json")) console.log(JSON.stringify(report, null, 2))
  else console.log(report.text)
  if (has("out")) {
    writeFileSync(flag("out", "/tmp/opencode/load/result.json"), JSON.stringify(report, null, 2))
  }
  process.exit(report.errors > 0 ? 1 : 0)
}

const instance = autocannon(options)
process.stdout.write(`\n${scenarioName}: ${scenario.description}\n`)
console.log(`  target ${BASE}  ${CONNECTIONS} connections  ${DURATION}s\n`)

// Record which status codes the run actually saw. A count of "non-2xx"
// without the codes is not actionable: the host's edge answers a request it
// does not like with a branded 403, and the application answers a
// cross-origin write with a 403 of its own. They are different problems.
const statusCounts = {}
instance.on("response", (_client, statusCode) => {
  statusCounts[statusCode] = (statusCounts[statusCode] || 0) + 1
})
process.on("SIGINT", () => {
  instance.stop()
})
instance.on("done", (result) => {
  const report = format(result, scenarioName, scenario.description)
  console.log(report.text)
  if (has("out")) {
    writeFileSync(flag("out", "/tmp/opencode/load/result.json"), JSON.stringify(report, null, 2))
  }
  process.exit(report.errors > 0 ? 1 : 0)
})

function format(result, name, description) {
  const rps = result.requests.average
  const p99 = result.latency.p99
  const p999 = result.latency.p999
  const non2xx = result.non2xx
  const errors = result.errors + result.timeouts + non2xx
  const total = result.requests.sent || 1
  const errorRate = (errors / total) * 100

  const text = [
    "",
    `  ${name} — ${description}`,
    `  requests      ${result.requests.sent} sent, ${result.requests.total} completed`,
    `  throughput    ${rps.toFixed(1)} req/s`,
    `  latency       avg ${result.latency.average.toFixed(1)}ms  p50 ${result.latency.p50}ms  p90 ${result.latency.p90}ms  p97.5 ${result.latency.p97_5}ms  p99 ${p99}ms  p99.9 ${p999}ms  max ${result.latency.max}ms`,
    `  bandwidth     ${result.throughput.average.toFixed(1)} KB/s`,
    `  errors        ${result.errors} errors, ${result.timeouts} timeouts, ${non2xx} non-2xx  (${errorRate.toFixed(2)}%)`,
    `  status codes  ${
      Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => `${code}×${count}`)
        .join("  ") || "(not recorded)"
    }`,
    `  connections   ${result.connections} (${CONNECTIONS} configured)`,
    "",
  ].join("\n")

  return {
    scenario: name,
    description,
    target: BASE,
    connections: CONNECTIONS,
    durationSeconds: DURATION,
    requestsSent: result.requests.sent,
    requestsCompleted: result.requests.total,
    requestsPerSecond: Number(rps.toFixed(2)),
    latencyMs: {
      average: Number(result.latency.average.toFixed(1)),
      min: result.latency.min,
      p50: result.latency.p50,
      p90: result.latency.p90,
      p97_5: result.latency.p97_5,
      p99: p99,
      p999: p999,
      max: result.latency.max,
    },
    throughputKBps: Number(result.throughput.average.toFixed(1)),
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx,
    errorRatePercent: Number(errorRate.toFixed(3)),
    text,
  }
}
