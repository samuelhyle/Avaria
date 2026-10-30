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
 * allowlist to `lib/i18n/client-message-slice.ts`. It runs in two modes:
 *
 *   node scripts/i18n-client-slice.mjs          # rewrite the allowlist
 *   node scripts/i18n-client-slice.mjs --check  # fail if the allowlist is stale
 *
 * The check mode is what keeps the slice honest: a client component that
 * starts reading a new key fails the build until the key is added to the
 * allowlist, instead of silently rendering `research.someKey` at runtime.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import ts from "typescript"

const require = createRequire(import.meta.url)

const SLICED_NAMESPACES = ["research", "experience", "store"]
const OUT = resolve("lib/i18n/client-message-slice.json")

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) return files(full)
    return /\.[jt]sx?$/.test(entry.name) ? [full] : []
  })
}

const roots = ["app", "components", "lib"].flatMap((dir) => {
  try {
    return files(dir)
  } catch {
    return []
  }
})

/** namespace → { keys: Set<string>, branches: Set<string>, unsafe: boolean } */
const usage = new Map()
for (const namespace of SLICED_NAMESPACES) {
  usage.set(namespace, { keys: new Set(), branches: new Set(), unsafe: false })
}

for (const file of roots) {
  const source = readFileSync(file, "utf8")
  // `useTranslations` is a client hook, so any module that calls it ends up in
  // the browser bundle — whether or not it carries the directive itself.
  if (!/^\s*["']use client["']/m.test(source) && !/useTranslations\(/.test(source)) continue
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  /** variable name → namespace */
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
        // `useTranslations("store.announce")` addresses a branch of a
        // namespace; the slice is computed per root namespace.
        const [root, branch] = arg.text.split(".")
        scopes.set(node.name.text, { root, branch })
        if (branch) {
          const entry = usage.get(root)
          if (entry) entry.branches.add(branch)
        }
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
      const namespace = scope.root
      const entry = usage.get(namespace)
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
      if (entry && arg) {
        if (ts.isStringLiteral(arg)) {
          entry.keys.add(scope.branch ? `${scope.branch}.${arg.text}` : arg.text)
        } else if (ts.isTemplateExpression(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
          // A dynamic key: keep the whole static branch it starts from.
          const head = arg.getText(ast).replace(/^`|`$/g, "").split("${")[0]
          const branch = head.replace(/\.$/, "")
          if (branch) entry.branches.add(branch)
        } else if (ts.isConditionalExpression(arg)) {
          // `t(flag ? "a" : "b")` — only the two branches are keys; the
          // condition is an expression, not a translation.
          for (const branch of [arg.whenTrue, arg.whenFalse]) {
            for (const literal of stringLiterals(branch)) {
              entry.keys.add(scope.branch ? `${scope.branch}.${literal}` : literal)
            }
          }
        } else {
          // The key comes from a variable, so it cannot be resolved here.
          // Shipping a partial namespace would silently drop it, so the whole
          // namespace is kept.
          entry.unsafe = true
          if (process.env.I18N_DEBUG) {
            console.error(
              `[i18n:slice] unsafe key in ${file}: ${arg.getText(ast).slice(0, 70)} (${namespace})`,
            )
          }
        }
      }
    }
    ts.forEachChild(node, collect)
  }
  collect(ast)
}

const messages = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8"))

function leaves(node, prefix = "") {
  if (node === null || typeof node !== "object") return [[prefix, node]]
  return Object.entries(node).flatMap(([key, value]) =>
    leaves(value, prefix ? `${prefix}.${key}` : key),
  )
}

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

/** Resolve the allowlist into the concrete keys that ship to the browser. */
function resolveKeys(namespace) {
  const { keys, branches, unsafe } = usage.get(namespace)
  const source = messages[namespace] ?? {}
  const out = new Set()
  for (const [path] of leaves(source)) {
    if (keys.has(path)) {
      out.add(path)
      continue
    }
    for (const branch of branches) {
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
  const missing = [...keys].filter((key) => !known.has(key))
  if (missing.length) {
    console.error(`[i18n:slice] ${namespace}: unknown key(s): ${missing.join(", ")}`)
    process.exit(1)
  }
  if (unsafe)
    return leaves(source)
      .map(([path]) => path)
      .sort()
  return [...out].sort()
}

const resolved = {}
for (const namespace of SLICED_NAMESPACES) resolved[namespace] = resolveKeys(namespace)

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
  const full = Object.entries(resolved).map(([ns, keys]) => {
    const all = leaves(messages[ns] ?? {})
    const bytes = all
      .filter(([path]) => keys.includes(path))
      .reduce((sum, [, value]) => sum + String(value ?? "").length, 0)
    const total = all.reduce((sum, [, value]) => sum + String(value ?? "").length, 0)
    return `${ns}: ${keys.length}/${all.length} keys, ${(bytes / 1024).toFixed(1)}KB of ${(total / 1024).toFixed(1)}KB`
  })
  console.log(`[i18n:slice] wrote ${OUT}\n  ${full.join("\n  ")}`)
}
