#!/usr/bin/env node
/**
 * i18n key-parity check.
 *
 * Loads every `messages/<locale>.json` file, builds the set of translation
 * keys (using dot notation for nested objects), and reports any key that is
 * missing in one or more locales.
 *
 * Exits 0 if all four locales (en, fi, sv, ru) have the same set of
 * leaf keys, 1 otherwise.
 *
 * Optional flags:
 *   --json     emit machine-readable JSON instead of a human report
 *   --locales  restrict the check to a comma-separated subset (default: all)
 *   --quiet    exit 0 even on missing keys (still prints the report)
 *
 * The Plan §3 / A11Y-3 commitment: "for every translation key used by a
 * client component, the key must exist in every locale file."
 *
 * Leaf vs branch: only leaf keys (those whose value is a string) are
 * compared. Branch keys (objects) are recursed into, not compared directly.
 * Placeholder-bearing values (e.g. "{count, plural, ...}") are still treated
 * as leaves; we only check presence, not content.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

const argv = process.argv.slice(2)
const jsonOut = argv.includes("--json")
const quiet = argv.includes("--quiet")
const localesArg = argv.find((a) => a === "--locales")
const locales = (localesArg ? argv[argv.indexOf("--locales") + 1] : "en,fi,sv,ru")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)

const dir = resolve(process.cwd(), "messages")

function walkLeaves(node, prefix, into) {
  if (node === null || typeof node !== "object") {
    into.add(prefix)
    return
  }
  if (Array.isArray(node)) {
    into.add(prefix)
    return
  }
  const keys = Object.keys(node)
  if (keys.length === 0) {
    // Treat empty objects as branches, not leaves, so the parity check
    // doesn't get noisy. If the structure diverges here, consumers will
    // surface it.
    return
  }
  for (const key of keys) {
    const next = prefix ? `${prefix}.${key}` : key
    walkLeaves(node[key], next, into)
  }
}

const sets = new Map()
for (const locale of locales) {
  const path = join(dir, `${locale}.json`)
  if (!statSync(path, { throwIfNoEntry: false })) {
    console.error(`[i18n:check] missing locale file: ${path}`)
    if (!quiet) process.exit(1)
    continue
  }
  const data = JSON.parse(readFileSync(path, "utf8"))
  const leaves = new Set()
  walkLeaves(data, "", leaves)
  sets.set(locale, leaves)
}

if (sets.size === 0) {
  if (!quiet) process.exit(1)
  process.exit(0)
}

// Reference = union (en is taken as the source of truth; union of all
// locales is what the project actually uses, so we report the diff against
// the union).
const union = new Set()
for (const s of sets.values()) {
  for (const k of s) union.add(k)
}

const missing = new Map() // locale -> Set<key>
for (const locale of locales) {
  const have = sets.get(locale) ?? new Set()
  const miss = new Set()
  for (const k of union) {
    if (!have.has(k)) miss.add(k)
  }
  if (miss.size > 0) missing.set(locale, miss)
}

const totalKeys = union.size
const totalMissing = [...missing.values()].reduce((sum, s) => sum + s.size, 0)

if (jsonOut) {
  process.stdout.write(
    `${JSON.stringify(
      {
        locales,
        totalKeys,
        totalMissing,
        missing: Object.fromEntries([...missing.entries()].map(([l, s]) => [l, [...s].sort()])),
      },
      null,
      2,
    )}\n`,
  )
} else {
  console.log(
    `[i18n:check] ${locales.length} locales · ${totalKeys} leaf keys · ${totalMissing} missing`,
  )
  if (totalMissing > 0) {
    for (const [locale, miss] of [...missing.entries()].sort()) {
      console.log(`  ${locale}: ${miss.size} missing`)
      for (const k of [...miss].sort().slice(0, 20)) {
        console.log(`    - ${k}`)
      }
      if (miss.size > 20) {
        console.log(`    … and ${miss.size - 20} more`)
      }
    }
  }
}

if (totalMissing > 0 && !quiet) {
  process.exit(1)
}
process.exit(0)
