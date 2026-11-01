#!/usr/bin/env node
/**
 * Keeps the browser copy of the large namespaces small.
 *
 * `research`, `experience` and `store` are read by both server and client
 * components. Server components read the complete namespace from the locale
 * file; client components only ever touch a handful of keys, but the whole
 * namespace was serialised into every page's RSC payload.
 *
 * This script works out which keys the client actually reads and writes the
 * allowlist to `lib/i18n/client-message-slice.json`. It runs in two modes:
 *
 *   node scripts/i18n-client-slice.mjs          # rewrite the allowlist
 *   node scripts/i18n-client-slice.mjs --check  # fail if the allowlist is stale
 *
 * The check mode is what keeps the slice honest: a client component that
 * starts reading a new key fails the build until the key is added to the
 * allowlist, instead of silently rendering `research.someKey` at runtime.
 *
 * The allowlist is computed per route, not globally. The shell — the header,
 * the footer, the cart drawer, the command palette, the chat widget — is on
 * every page. A route's own components are on that route only. A global
 * union shipped the shop's copy to the home page as well.
 *
 * For each namespace the file records:
 *
 *   shell   the keys every page needs
 *   routes  the extra keys a particular route needs, on top of the shell's
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import ts from "typescript"

const ROOT = resolve(".")
const OUT = resolve("lib/i18n/client-message-slice.json")

/**
 * The namespaces that are sliced.
 *
 * Every namespace the browser reads is a candidate, but the ones that are
 * read by a single client component and nowhere else are already tiny. The
 * large ones — `research`, `experience`, `store`, `averia`, `home`, `shop`,
 * `calculator`, `cart`, `nav` — carry a lot of copy that only the server
 * renders, and slicing them is where the weight is.
 */
const SLICED_NAMESPACES = [
  "research",
  "experience",
  "store",
  "averia",
  "home",
  "shop",
  "calculator",
  "cart",
  "nav",
  "common",
  "compare",
  "notifications",
  "cookie",
  "ageGate",
  "a11y",
  "documentLibrary",
  "plans",
  "product",
  "checkout",
  "auth",
  "account",
  "community",
  "gdpr",
  "contact",
  "newsletter",
]

// ── Module graph ────────────────────────────────────────────────────────────

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

/**
 * Every module a file imports, resolved to project files.
 *
 * Dynamic imports count as well. `dynamic(() => import("…"))` is how the
 * shell loads its heavier client components — the command palette, the chat
 * widget — and a static-only walk does not see them. The shell's own keys
 * would then be missing from every page.
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

/** All modules reachable from an entry, including the entry itself. */
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

// ── Key extraction ──────────────────────────────────────────────────────────

/** Every string literal inside an expression. */
function stringLiterals(node) {
  const out = []
  const walk = (child) => {
    if (ts.isStringLiteral(child)) out.push(child.text)
    ts.forEachChild(child, walk)
  }
  walk(node)
  return out
}

/**
 * The translation keys a module reads.
 *
 * A module is a browser module when it calls `useTranslations` — the hook is
 * a client hook, so any module that calls it ends up in the browser bundle
 * whether or not it carries the `"use client"` directive itself.
 *
 * Returns a map of namespace → { keys, branches, unsafe }.
 */
function keysOf(file) {
  const source = read(file)
  const found = new Map()
  if (!source) return found
  // A module that publishes the keys it needs in a `*_MESSAGE_KEYS` map is
  // read even when it looks like a server module: the map exists precisely
  // because the call sites cannot be analysed.
  const publishesMessageKeys = /export const \w+_MESSAGE_KEYS\s*(?::[^=]+)?=/.test(source)
  if (
    !/^\s*["']use client["']/m.test(source) &&
    !/useTranslations\(/.test(source) &&
    !publishesMessageKeys
  )
    return found

  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  /** variable name → { namespace, branch } */
  const scopes = new Map()
  /**
   * An alias of a translator: `const pt = t`. The alias reads the same
   * namespace as the translator it copies, so `pt("…")` has to be resolved
   * against it rather than treated as an unknown key.
   */
  const aliases = new Map()
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
        // `useTranslations("store.announce")` addresses a branch of a
        // namespace; the slice is computed per root namespace.
        const [root, branch] = arg.text.split(".")
        scopes.set(node.name.text, { root, branch })
      }
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isIdentifier(node.initializer) &&
      scopes.has(node.initializer.text)
    ) {
      aliases.set(node.name.text, scopes.get(node.initializer.text))
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)

  // Resolve the aliases now that every translator is known.
  for (const [alias, target] of aliases) {
    scopes.set(alias, target)
  }

  const entryFor = (namespace) => {
    let entry = found.get(namespace)
    if (!entry) {
      entry = { keys: new Set(), branches: new Set(), unsafe: false }
      found.set(namespace, entry)
    }
    return entry
  }

  // A module that hands its keys to an injected translator — the assistant's
  // error copy is read through a function parameter, so the call site shows
  // no key at all. Such a module publishes the keys it needs in a map, and
  // the map is read here so they stay in the browser's message slice.
  for (const match of source.matchAll(
    /export const \w+_MESSAGE_KEYS\s*(?::[^=]+)?=\s*\{([\s\S]*?)\n\}/g,
  )) {
    // The map is `{ "namespace": ["key", …] }`. The key list is read up to
    // the closing bracket of its own array, so a key that contains a
    // bracket does not end it early.
    for (const group of match[1].matchAll(/["']?([a-zA-Z]+)["']?:\s*\[([^\]]*)\]/g)) {
      const entry = entryFor(group[1])
      for (const key of group[2].matchAll(/"([^"]+)"/g)) {
        entry.keys.add(key[1])
      }
    }
  }

  const collect = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      scopes.has(node.expression.text)
    ) {
      const scope = scopes.get(node.expression.text)
      const entry = entryFor(scope.root)
      // `t(\`x.${y}\` as never)` — unwrap the parentheses and the assertion.
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
      if (arg) {
        if (ts.isStringLiteral(arg)) {
          entry.keys.add(scope.branch ? `${scope.branch}.${arg.text}` : arg.text)
        } else if (ts.isTemplateExpression(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
          // A dynamic key: keep the whole static branch it starts from.
          //
          // `` `${it.id}.prompt` `` has no static prefix, so the branch is
          // the one the reader is scoped to: `useTranslations("averia.
          // quickActions")` with that call needs every key under
          // `averia.quickActions`.
          const head = arg.getText(ast).replace(/^`|`$/g, "").split("${")[0]
          const branch = head.replace(/\.$/, "")
          if (branch) entry.branches.add(branch)
          else if (scope.branch) entry.branches.add(scope.branch)
          else entry.unsafe = true
        } else if (ts.isConditionalExpression(arg)) {
          // `t(flag ? "a" : "b")` — only the two branches are keys; the
          // condition is an expression, not a translation.
          for (const branch of [arg.whenTrue, arg.whenFalse]) {
            for (const literal of stringLiterals(branch)) {
              entry.keys.add(scope.branch ? `${scope.branch}.${literal}` : literal)
            }
          }
        } else {
          // The key comes from a variable. Sometimes the variable is a
          // property of a literal array declared in the same file — the
          // quick filters read `t(pill.labelKey)` over a fixed list of
          // pills — and the set of keys is then known.
          const literal = literalStringValues(arg, ast, source)
          if (literal) {
            for (const key of literal) {
              entry.keys.add(scope.branch ? `${scope.branch}.${key}` : key)
            }
          } else {
            // Otherwise the set cannot be bounded. What has to stay is the
            // *branch* the reader is scoped to —
            // `useTranslations("averia.toolLabels")` with a dynamic key needs
            // every key under `averia.toolLabels` and not the ninety other
            // keys of `averia`.
            entry.unsafe = true
            if (scope.branch) entry.branches.add(scope.branch)
            if (process.env.I18N_DEBUG) {
              console.error(
                `[i18n:slice] unsafe key in ${relative(ROOT, file)}: ${arg.getText(ast).slice(0, 70)}`,
              )
            }
          }
        }
      }
    }
    ts.forEachChild(node, collect)
  }
  collect(ast)

  return found
}

// ── Route tree ──────────────────────────────────────────────────────────────

const localeRoot = join(ROOT, "app", "[locale]")

/** Every `page.tsx` under the locale segment, with its route path. */
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
    // Route groups are organisational only; they never appear in the URL.
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

/** The client modules a route renders: its layout, its page and their imports. */
function routeModules(dir) {
  const files = new Set()
  const entries = [join(dir, "layout.tsx"), join(dir, "page.tsx")].filter(exists)
  for (const entry of entries) {
    for (const file of reachable(entry)) files.add(file)
  }
  return files
}

// ── Resolve the allowlist ───────────────────────────────────────────────────

const messages = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8"))

function leaves(node, prefix = "") {
  if (node === null || typeof node !== "object") return [[prefix, node]]
  return Object.entries(node).flatMap(([key, value]) =>
    leaves(value, prefix ? `${prefix}.${key}` : key),
  )
}

/**
 * The literal strings a variable can hold.
 *
 * The common pattern is a lookup into an array or object declared with
 * literal values in the same file:
 *
 *   const PILLS = [{ labelKey: "inStock" }, { labelKey: "documents" }]
 *   t(pill.labelKey)
 *
 * The key set is bounded by the literal, so the namespace can still be
 * sliced. Returns null when the value cannot be bounded, which keeps the
 * whole branch rather than dropping a key at runtime.
 */
function literalStringValues(arg, ast, source) {
  // `pill.labelKey` — a property access on an identifier.
  const property = ts.isPropertyAccessExpression(arg) ? arg : null
  const variable = property
    ? ts.isIdentifier(property.expression)
      ? property.expression
      : null
    : ts.isIdentifier(arg)
      ? arg
      : null
  if (!variable || !property) return null

  const propertyName = property.name.getText(ast)

  // The variable is usually the iteration parameter of a map over a literal
  // array: `PILLS.map((pill) => …)`. Find the array's name.
  const iteration = new RegExp(
    `\\b([A-Za-z_$][\\w$]*)\\s*\\.map\\s*\\(\\s*\\(?\\s*${variable.text}\\s*\\)?`,
    "m",
  )
  const iterated = iteration.exec(source)
  const arrayName = iterated?.[1] ?? variable.text

  // Find the literal the iteration walks. The brackets are balanced by
  // scanning, because a literal can contain another one — an icon array
  // inside an entry would end a naive match early.
  const declaration = new RegExp(`(?:const|let|var)\\s+${arrayName}\\s*(?::[^=]+)?=\\s*[\\[{]`, "m")
  const start = declaration.exec(source)
  if (!start) return null

  const open = source[start.index + start[0].length - 1]
  const close = open === "[" ? "]" : "}"
  let depth = 1
  let index = start.index + start[0].length
  while (index < source.length && depth > 0) {
    const char = source[index]
    if (char === open) depth += 1
    else if (char === close) depth -= 1
    index += 1
  }
  const body = source.slice(start.index + start[0].length, index - 1)

  const values = new Set()
  // `labelKey: "documents"` inside the literal.
  const entryPattern = new RegExp(`${propertyName}\\s*:\\s*"([^"]*)"`, "g")
  for (const found of body.matchAll(entryPattern)) values.add(found[1])

  return values.size > 0 ? [...values] : null
}

/** Merge the keys of several modules into one namespace entry. */
function mergeInto(target, source) {
  for (const [namespace, entry] of source) {
    const into = target.get(namespace) ?? {
      keys: new Set(),
      branches: new Set(),
      unsafe: false,
    }
    for (const key of entry.keys) into.keys.add(key)
    for (const branch of entry.branches) into.branches.add(branch)
    if (entry.unsafe) into.unsafe = true
    target.set(namespace, into)
  }
}

/** The concrete keys a namespace entry resolves to. */
function resolveKeys(namespace, entry) {
  const source = messages[namespace] ?? {}
  const out = new Set()
  for (const [path] of leaves(source)) {
    if (entry.keys.has(path)) {
      out.add(path)
      continue
    }
    for (const branch of entry.branches) {
      // A template key can name a whole sub-object (`categories.${x}`) or a
      // family of keys that share a prefix (`faq${x}Question`), so the branch
      // is matched as a path segment or as a plain prefix.
      if (path === branch || path.startsWith(`${branch}.`) || path.startsWith(branch)) {
        out.add(path)
      }
    }
  }
  // Keys referenced but missing from the locale file are a hard error.
  const known = new Set(leaves(source).map(([path]) => path))
  const missing = [...entry.keys].filter((key) => !known.has(key))
  if (missing.length) {
    console.error(`[i18n:slice] ${namespace}: unknown key(s): ${missing.join(", ")}`)
    process.exit(1)
  }
  if (entry.unsafe && entry.branches.size === 0) {
    // A dynamic key with no branch to bound it: the whole namespace has to
    // stay, or a key would be dropped at runtime.
    return leaves(source)
      .map(([path]) => path)
      .sort()
  }
  return [...out].sort()
}

// The shell: the locale layout and everything it renders.
const shellModules = reachable(join(localeRoot, "layout.tsx"))
const shellUsage = new Map()
for (const file of shellModules) mergeInto(shellUsage, keysOf(file))

// Each route: the shell plus the route's own modules.
const routes = routeEntries(localeRoot)
const routeUsage = new Map()
for (const { dir, route } of routes) {
  const usage = new Map()
  for (const [namespace, entry] of shellUsage) {
    usage.set(namespace, {
      keys: new Set(entry.keys),
      branches: new Set(entry.branches),
      unsafe: entry.unsafe,
    })
  }
  for (const file of routeModules(dir)) mergeInto(usage, keysOf(file))
  routeUsage.set(route, usage)
}

const resolved = {}
for (const namespace of SLICED_NAMESPACES) {
  const shellEntry = shellUsage.get(namespace) ?? {
    keys: new Set(),
    branches: new Set(),
    unsafe: false,
  }
  const shellKeys = resolveKeys(namespace, shellEntry)

  // The shell has to carry every route's keys.
  //
  // The App Router does not re-render a layout on a client-side navigation
  // inside its segment, and the layout holds the `NextIntlClientProvider`.
  // The browser's messages are therefore fixed by the first page it loaded:
  // a visitor who lands on the cart and then navigates to the email step
  // keeps the cart's messages, and the step's own keys are missing. The
  // shell is the union of the shell's own keys and every route's, so the
  // provider holds the right copy whichever route the visitor started from.
  const union = new Set(shellKeys)
  const routeKeys = {}
  for (const [route, usage] of routeUsage) {
    const entry = usage.get(namespace)
    if (!entry) continue
    const keys = resolveKeys(namespace, entry)
    if (keys.length === 0) continue
    for (const key of keys) union.add(key)
    // The per-route set is kept so the caller can tell which route a key
    // belongs to.
    routeKeys[route] = keys
  }
  resolved[namespace] = { shell: [...union].sort(), routes: routeKeys }
}

// The allowlist lives in JSON so the generator, the CI check and the
// application all read exactly the same bytes.
const body = `${JSON.stringify(resolved, null, 2)}\n`

if (process.argv.includes("--check")) {
  // Compare the parsed object, not the raw text: the formatter is free to
  // reformat the file without making the slice stale.
  const current = readFileSync(OUT, "utf8")
  // Compare the parsed object: the file is generated, so its formatting is
  // not part of the contract.
  if (JSON.stringify(JSON.parse(current)) !== JSON.stringify(resolved)) {
    console.error(
      "[i18n:slice] lib/i18n/client-message-slice.ts is stale — run `node scripts/i18n-client-slice.mjs`",
    )
    process.exit(1)
  }
  console.log("[i18n:slice] client message slice is up to date")
} else {
  writeFileSync(OUT, body)
  const full = Object.entries(resolved).map(([ns, entry]) => {
    const all = leaves(messages[ns] ?? [])
    const bytesOf = (keys) =>
      all
        .filter(([path]) => keys.includes(path))
        .reduce((sum, [, value]) => sum + String(value ?? "").length, 0)
    const routeExtra = Object.values(entry.routes).flat()
    return `${ns}: shell ${entry.shell.length}/${all.length} keys ${(bytesOf(entry.shell) / 1024).toFixed(1)}KB · routes add ${routeExtra.length} keys ${(bytesOf(routeExtra) / 1024).toFixed(1)}KB`
  })
  console.log(`[i18n:slice] wrote ${OUT}\n  ${full.join("\n  ")}`)
}
