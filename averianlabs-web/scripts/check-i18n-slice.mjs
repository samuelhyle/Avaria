#!/usr/bin/env node
/**
 * Verifies that every key the browser reads survives the message slice.
 *
 * The slice (`scripts/i18n-client-slice.mjs`) decides statically which
 * translation keys reach the browser. A key it cannot see is dropped, and
 * next-intl renders the raw key path in the page — a silent content bug
 * that no type check and no unit test catches.
 *
 * This script closes that gap. It walks the client components exactly as
 * the slice generator does, collects every key that is read, and fails when
 * the resolved slice for the route that renders the component does not
 * contain it.
 *
 * The check is per route: the shell's keys must be present on every route,
 * and a route's own keys must be present on that route.
 *
 * Usage:
 *   node scripts/check-i18n-slice.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import ts from "typescript"

const ROOT = resolve(".")
const SLICE = JSON.parse(readFileSync(resolve("lib/i18n/client-message-slice.json"), "utf8"))
const MESSAGES = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8"))

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

function reachable(entry) {
  const seen = new Set()
  const queue = [entry]
  while (queue.length) {
    const file = queue.pop()
    if (!file || seen.has(file)) continue
    seen.add(file)
    for (const imported of importsOf(file)) {
      if (!seen.has(imported)) queue.push(imported)
    }
  }
  return seen
}

/**
 * The literal keys a module reads.
 *
 * Only literal keys are collected. A dynamic key is the slice generator's
 * problem — it keeps the whole branch for those — so it cannot silently
 * drop a key here.
 */
function literalKeysOf(file) {
  const source = read(file)
  const found = []
  if (!source) return found
  if (!/^\s*["']use client["']/m.test(source) && !/useTranslations\(/.test(source)) return found

  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  const scopes = new Map()
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ["useTranslations", "getTranslations"].includes(node.initializer.expression.getText(ast))
    ) {
      const arg = node.initializer.arguments[0]
      if (arg && ts.isStringLiteral(arg)) {
        const [root, branch] = arg.text.split(".")
        scopes.set(node.name.text, { root, branch })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)

  const collect = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      scopes.has(node.expression.text)
    ) {
      const scope = scopes.get(node.expression.text)
      let arg = node.arguments[0]
      while (
        arg &&
        (ts.isParenthesizedExpression(arg) ||
          ts.isAsExpression(arg) ||
          ts.isNonNullExpression(arg) ||
          ts.isTypeAssertionExpression(arg))
      ) {
        arg = arg.expression
      }
      if (arg && ts.isStringLiteral(arg)) {
        found.push({
          namespace: scope.root,
          key: scope.branch ? `${scope.branch}.${arg.text}` : arg.text,
        })
      }
    }
    ts.forEachChild(node, collect)
  }
  collect(ast)

  return found
}

/** Every key that exists in the locale file under a path. */
function keyExists(namespace, key) {
  const source = MESSAGES[namespace]
  if (!source) return false
  let node = source
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return false
    node = node[part]
  }
  return typeof node === "string"
}

/** The keys the slice keeps for a namespace on a route. */
function sliceKeys(namespace, route) {
  const entry = SLICE[namespace]
  if (!entry) return null // not sliced: the whole namespace ships
  const keys = new Set(entry.shell)
  const matches = Object.keys(entry.routes)
    .filter((prefix) => route === prefix || route.startsWith(`${prefix}/`))
    .sort((a, b) => b.length - a.length)
  for (const key of entry.routes[matches[0] ?? ""] ?? []) keys.add(key)
  return keys
}

// ── Route tree ──────────────────────────────────────────────────────────────

const localeRoot = join(ROOT, "app", "[locale]")

function routeEntries(dir, prefix = "") {
  const out = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  // The segment's own page is a route too — `app/[locale]/page.tsx` is the
  // home page. Without it the home route never appears in the slice, and the
  // keys its client components read are dropped.
  if (exists(join(dir, "page.tsx"))) {
    out.push({ dir, route: prefix || "/" })
  } else if (exists(join(dir, "layout.tsx"))) {
    // A segment with a layout but no page of its own — `app/[locale]/
    // checkout` — still renders client components on every route below it.
    // The entry is keyed by the segment, so it is a prefix of the routes
    // that use it.
    out.push({ dir, route: prefix || "/" })
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    if (name.startsWith("(") && name.endsWith(")")) {
      out.push(...routeEntries(join(dir, name), prefix))
      continue
    }
    const full = join(dir, name)
    if (exists(join(full, "page.tsx"))) {
      // The home page's route is "/" — the same path the runtime passes.
      out.push({ dir: full, route: `${prefix}/${name}` || "/" })
    }
    out.push(...routeEntries(full, `${prefix}/${name}`))
  }
  return out
}

const problems = []

function checkRoute(route, files) {
  for (const file of files) {
    for (const { namespace, key } of literalKeysOf(file)) {
      if (!keyExists(namespace, key)) continue
      const kept = sliceKeys(namespace, route)
      if (kept === null) continue
      if (kept.has(key)) continue
      problems.push({ route, file: relative(ROOT, file), key: `${namespace}.${key}` })
    }
  }
}

// Every route: its layout, its page and their imports.
for (const { dir, route } of routeEntries(localeRoot)) {
  const files = new Set()
  for (const entry of [join(dir, "layout.tsx"), join(dir, "page.tsx")].filter(exists)) {
    for (const file of reachable(entry)) files.add(file)
  }
  checkRoute(route, files)
}

// The shell renders on every route.
checkRoute("/", reachable(join(localeRoot, "layout.tsx")))

if (problems.length) {
  console.error("[i18n:slice] the message slice drops keys the browser reads:")
  for (const problem of problems) {
    console.error(`  ${problem.route} ${problem.key}  (${problem.file})`)
  }
  console.error("  Run `node scripts/i18n-client-slice.mjs` to regenerate the allowlist.")
  process.exit(1)
}

console.log("[i18n:slice] every key the browser reads survives the slice")
