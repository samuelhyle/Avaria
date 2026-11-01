#!/usr/bin/env node
/**
 * Route-level cost profile.
 *
 * Measures each route in isolation so the time spent rendering a page can be
 * separated from the time spent talking to the database. A route that is
 * cheap on its own but expensive under load points at a shared resource —
 * a connection pool, a lock, or a cache that is being recomputed on every
 * request.
 *
 * Usage: node scripts/load/profile-routes.mjs [--url=...] [--connections=4] [--duration=6]
 */
import { createRequire } from "node:module"

const require = createRequire("/tmp/opencode/load/")
const autocannon = require("autocannon")

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

const BASE = flag("url", "http://localhost:3000")
const CONNECTIONS = Number(flag("connections", 4))
const DURATION = Number(flag("duration", 6))

const ROUTES = [
  ["/api/health", "health — no render, one DB ping"],
  ["/api/search?q=peptide", "search API"],
  ["/en/about", "about — mostly static copy"],
  ["/en", "home — full catalogue + 3 renders"],
  ["/en/shop", "shop — full catalogue + many renders"],
  ["/en/shop/bpc-157", "product — one product, one render"],
  ["/en/quality", "quality — one certificate mock"],
  ["/en/documents", "documents — document library"],
]

function measure(path) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: `${BASE}${path}`,
        connections: CONNECTIONS,
        duration: DURATION,
        headers: { "accept-encoding": "gzip", "accept-language": "en" },
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    )
    instance.on("error", reject)
  })
}

console.log(`\nProfile against ${BASE} — ${CONNECTIONS} connections, ${DURATION}s each\n`)
console.log(
  "  route".padEnd(24),
  "rps".padStart(8),
  "avg ms".padStart(9),
  "p99 ms".padStart(8),
  "KB/req".padStart(9),
)
console.log(`  ${"-".repeat(60)}`)

for (const [path, label] of ROUTES) {
  const result = await measure(path)
  const bytes = result.requests.total ? result.throughput.total / result.requests.total : 0
  console.log(
    `  ${label.padEnd(24)} ${result.requests.average.toFixed(1).padStart(8)} ${result.latency.average.toFixed(1).padStart(9)} ${String(result.latency.p99).padStart(8)} ${(bytes / 1024).toFixed(1).padStart(9)}`,
  )
}
console.log("")
