#!/usr/bin/env node
/**
 * Which public routes render the same HTML for every visitor?
 *
 * A page can only be served from the CDN cache if its response does not
 * depend on who is asking. This script walks the route tree and reports the
 * routes whose page and layout never read the session.
 *
 * The result is the allowlist `middleware.ts` uses to set a shared
 * `Cache-Control` on the routes that can be cached, and to leave the rest
 * uncached.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

const ROOT = resolve(".")

/** Calls that read the visitor's session. */
const SESSION_READS = [
  /getCurrentMember\s*\(/,
  /requireMember\s*\(/,
  /requireRole\s*\(/,
  /\bauth\s*\(\s*\)/,
  /countUnreadNotifications\s*\(/,
  /listUnreadNotifications\s*\(/,
  /cookies\s*\(\s*\)/,
]

function read(file) {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return null
  }
}

function exists(file) {
  try {
    return statSync(file).isFile()
  } catch {
    return false
  }
}

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

function importsOf(file) {
  const source = read(file)
  if (!source) return []
  const out = []
  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
    const resolved = resolveImport(match[1], file)
    if (resolved) out.push(resolved)
  }
  return out
}

/** Every module a file reaches, and the ones that read the session. */
function analyse(file, seen = new Set()) {
  if (!file || seen.has(file)) return { session: false, readers: [] }
  seen.add(file)
  const source = read(file)
  if (!source) return { session: false, readers: [] }

  const readers = []
  for (const pattern of SESSION_READS) {
    if (pattern.test(source)) {
      readers.push(relative(ROOT, file))
      break
    }
  }
  for (const imported of importsOf(file)) {
    const nested = analyse(imported, seen)
    readers.push(...nested.readers)
  }
  return { session: readers.length > 0, readers: [...new Set(readers)] }
}

const localeRoot = join(ROOT, "app", "[locale]")

function routeEntries(dir, prefix = "") {
  const out = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    if (name.startsWith("(") && name.endsWith(")")) {
      out.push(...routeEntries(join(dir, name), prefix))
      continue
    }
    const full = join(dir, name)
    if (exists(join(full, "page.tsx"))) out.push({ dir: full, route: `${prefix}/${name}` || "/" })
    out.push(...routeEntries(full, `${prefix}/${name}`))
  }
  return out
}

const cacheable = []
const private_ = []

for (const { dir, route } of routeEntries(localeRoot)) {
  const files = [join(dir, "page.tsx"), join(dir, "layout.tsx")].filter(exists)
  const readers = new Set()
  for (const file of files) {
    for (const reader of analyse(file).readers) readers.add(reader)
  }
  if (readers.size === 0) cacheable.push(route)
  else private_.push({ route, readers: [...readers] })
}

console.log(`\nCacheable (the response is the same for every visitor): ${cacheable.length}`)
for (const route of cacheable) console.log(`  ${route}`)
console.log(`\nNot cacheable: ${private_.length}`)
for (const entry of private_) {
  console.log(`  ${entry.route}  ← ${entry.readers.join(", ")}`)
}
