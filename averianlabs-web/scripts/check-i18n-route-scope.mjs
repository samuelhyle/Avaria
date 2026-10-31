#!/usr/bin/env node
/**
 * Verifies that every route ships the translation namespaces its client
 * components read.
 *
 * The storefront stopped serialising one global list of namespaces into every
 * page and resolves them per route instead (see `lib/i18n/client-namespaces`).
 * That is a large win in page weight, but it means a namespace that is only
 * added for one route breaks as soon as a component that reads it is rendered
 * somewhere else.
 *
 * This script walks the route tree, resolves the client components each route
 * renders, collects the namespaces they read, and fails when the route's
 * namespace set does not cover them.
 *
 * Usage:
 *   node scripts/check-i18n-route-scope.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { clientNamespacesFor } from "../lib/i18n/client-namespaces.ts"

const ROOT = resolve(".")
const ALIAS = { "@/": `${ROOT}/` }

/** Read a file and return its source, or null when it does not exist. */
function read(file) {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return null
  }
}

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.[jt]sx?$/.test(entry.name)) out.push(full)
  }
  return out
}

/** Resolve an import specifier to a file inside the project. */
function resolveImport(specifier, fromFile) {
  if (specifier.startsWith("@/")) {
    const base = join(ROOT, specifier.slice(2))
    for (const candidate of [
      `${base}.tsx`,
      `${base}.ts`,
      join(base, "index.tsx"),
      join(base, "index.ts"),
    ]) {
      if (exists(candidate)) return candidate
    }
    return null
  }
  if (specifier.startsWith(".")) {
    const base = resolve(dirname(fromFile), specifier)
    for (const candidate of [
      `${base}.tsx`,
      `${base}.ts`,
      join(base, "index.tsx"),
      join(base, "index.ts"),
    ]) {
      if (exists(candidate)) return candidate
    }
    return null
  }
  return null
}

function exists(file) {
  try {
    return statSync(file).isFile()
  } catch {
    return false
  }
}

/** Namespaces read by a module, if it is a client module. */
function namespacesOf(file) {
  const source = read(file)
  if (!source) return []
  if (!/^\s*["']use client["']/m.test(source)) return []
  const found = new Set()
  for (const match of source.matchAll(/useTranslations\(\s*["']([a-zA-Z0-9_-]+)["']\s*\)/g)) {
    found.add(match[1])
  }
  for (const match of source.matchAll(/getTranslations\(\s*["']([a-zA-Z0-9_-]+)["']\s*\)/g)) {
    found.add(match[1])
  }
  return [...found]
}

/**
 * Every module a file imports, resolved to project files.
 *
 * Dynamic imports count as well: `dynamic(() => import("…"))` is how the
 * shell loads the command palette and the chat widget, and a static-only
 * walk does not see them.
 */
function importsOf(file) {
  const source = read(file)
  if (!source) return []
  const out = []
  const seen = new Set()
  for (const match of source.matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)) {
    const resolved = resolveImport(match[1], file)
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved)
      out.push(resolved)
    }
  }
  return out
}

/** All client modules reachable from a route entry, with their namespaces. */
function clientModulesUnder(entry) {
  const seen = new Set()
  const namespaces = new Set()
  const queue = [entry]
  while (queue.length) {
    const file = queue.pop()
    if (!file || seen.has(file)) continue
    seen.add(file)
    for (const namespace of namespacesOf(file)) namespaces.add(namespace)
    for (const imported of importsOf(file)) {
      if (!seen.has(imported)) queue.push(imported)
    }
  }
  return namespaces
}

const localeRoot = join(ROOT, "app", "[locale]")
const problems = []
const routes = []

/** Every `page.tsx` under the locale segment, with its route path. */
function routeEntries(dir, prefix = "") {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    // Route groups are organisational only; they never appear in the URL.
    if (name.startsWith("(") && name.endsWith(")")) {
      out.push(...routeEntries(join(dir, name), prefix))
      continue
    }
    const full = join(dir, name)
    if (exists(join(full, "page.tsx"))) out.push({ dir: full, route: `${prefix}/${name}` })
    out.push(...routeEntries(full, `${prefix}/${name}`))
  }
  return out
}

for (const { dir, route } of routeEntries(localeRoot)) {
  const pageFile = join(dir, "page.tsx")
  const layoutFile = join(dir, "layout.tsx")
  const namespaces = clientModulesUnder(exists(layoutFile) ? layoutFile : pageFile)
  for (const imported of importsOf(pageFile)) {
    for (const namespace of namespacesOf(imported)) namespaces.add(namespace)
  }
  const shipped = new Set(clientNamespacesFor(`/en${route}`))
  const missing = [...namespaces].filter((namespace) => !shipped.has(namespace))
  routes.push({ route, needed: namespaces.size, shipped: shipped.size, missing })
  if (missing.length) problems.push({ route, missing })
}

// The locale layout itself renders the shell for every route.
{
  const layoutFile = join(localeRoot, "layout.tsx")
  const namespaces = clientModulesUnder(layoutFile)
  const shipped = new Set(clientNamespacesFor("/en"))
  const missing = [...namespaces].filter((namespace) => !shipped.has(namespace))
  if (missing.length) problems.push({ route: "(locale layout)", missing })
}

if (problems.length) {
  console.error("[i18n:scope] routes are missing translation namespaces:")
  for (const problem of problems) {
    console.error(`  ${problem.route}: ${problem.missing.join(", ")}`)
  }
  console.error("  Add them to lib/i18n/client-namespaces.ts")
  process.exit(1)
}

console.log(`[i18n:scope] ${routes.length} routes — every client namespace is shipped`)
for (const route of routes) {
  console.log(
    `  ${route.route.padEnd(22)} needs ${route.needed} namespaces, ships ${route.shipped}`,
  )
}
