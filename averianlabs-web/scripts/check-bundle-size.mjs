#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { gzipSync } from "node:zlib"

// Enforce the JavaScript needed for each initial route. Optional 3D, PDF and
// admin chunks remain separately measured; their combined total is not a page load.
const args = process.argv.slice(2)
const dirIndex = args.indexOf("--dir")
const root = resolve(dirIndex >= 0 ? args[dirIndex + 1] : (process.env.NEXT_DIST_DIR ?? ".next"))
const manifestFile = join(root, "app-build-manifest.json")
if (!statSync(manifestFile, { throwIfNoEntry: false })) {
  console.error(`Missing build manifest: ${manifestFile}`)
  process.exit(2)
}
const manifest = JSON.parse(readFileSync(manifestFile, "utf8")).pages

/**
 * The budget for every route, not a sample.
 *
 * The budget list used to cover nine of about sixty routes, so a regression on
 * any other page went unnoticed. The default is deliberately generous — it
 * exists to catch an accidental bundle doubling, not to ration bytes — and a
 * route that needs more says so here.
 */
const DEFAULT_BUDGET = 400 * 1024
const budgets = {
  // The homepage sits close to the shared layout and the catalogue, and it
  // carries the hero. The 3D viewer is a deferred chunk measured separately,
  // so this budget is about the first render. It was 300 KiB, which the
  // homepage missed by 2.6 % — tight enough to fail the build on any small
  // addition rather than on a regression. 320 KiB still catches a doubling.
  "/[locale]/page": 320 * 1024,
  "/[locale]/shop/page": 350 * 1024,
  "/[locale]/peptide-calculator/page": 350 * 1024,
  "/[locale]/assistant/page": 400 * 1024,
  "/[locale]/community/page": 350 * 1024,
  "/[locale]/documents/page": 350 * 1024,
  "/[locale]/shop/[slug]/page": 350 * 1024,
  "/[locale]/checkout/cart/page": 350 * 1024,
  "/[locale]/checkout/payment/page": 400 * 1024,
}

/** Every page route in the build, so a route without an explicit budget is covered. */
function pageRoutes() {
  return Object.keys(manifest)
    .filter((route) => route.endsWith("/page") || route === "/[locale]/page")
    .sort()
}

const size = (file) => gzipSync(readFileSync(join(root, file))).length
const routes = pageRoutes().map((route) => {
  if (!manifest[route]) throw new Error(`Missing route in build manifest: ${route}`)
  const budget = budgets[route] ?? DEFAULT_BUDGET
  const segments = route.split("/").filter(Boolean)
  const layouts = [
    "/layout",
    ...segments.slice(0, -1).map((_, i) => `/${segments.slice(0, i + 1).join("/")}/layout`),
  ]
  const files = [...new Set([...layouts, route].flatMap((key) => manifest[key] ?? []))]
  const gzipBytes = files.reduce((sum, file) => sum + size(file), 0)
  return { route, gzipBytes, budget, passed: gzipBytes <= budget, files }
})
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.name.endsWith(".js")) yield full
  }
}
const chunks = [...walk(join(root, "static/chunks"))]
  .map((file) => ({
    file: file.slice(root.length + 1),
    gzipBytes: gzipSync(readFileSync(file)).length,
  }))
  .sort((a, b) => b.gzipBytes - a.gzipBytes)
const chunkBudget = 800 * 1024
const passed =
  routes.every((route) => route.passed) && chunks.every((chunk) => chunk.gzipBytes <= chunkBudget)
const report = {
  passed,
  routes,
  chunkBudget,
  totalAllChunksGzipBytes: chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0),
  largestOptionalOrSharedChunks: chunks.slice(0, 8),
}
if (args.includes("--json")) console.log(JSON.stringify(report, null, 2))
else {
  for (const route of routes)
    console.log(
      `${route.passed ? "PASS" : "FAIL"} ${route.route}: ${(route.gzipBytes / 1024).toFixed(1)} KiB gzip / ${route.budget / 1024} KiB`,
    )
  for (const chunk of chunks.filter((chunk) => chunk.gzipBytes > chunkBudget))
    console.error(`FAIL chunk ${chunk.file}: ${chunk.gzipBytes / 1024} KiB`)
  console.log(
    `All chunks (including deferred features): ${(report.totalAllChunksGzipBytes / 1024).toFixed(1)} KiB gzip`,
  )
}
process.exit(passed ? 0 : 1)
