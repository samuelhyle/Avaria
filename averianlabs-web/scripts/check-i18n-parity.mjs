#!/usr/bin/env node
/**
 * i18n key parity check.
 *
 * Enumerates the keys in every `messages/<locale>.json` file and fails if
 * any locale is missing keys that exist in the reference locale (`en`) or
 * has extra keys that aren't in `en`.
 *
 * Usage:
 *   node scripts/check-i18n-parity.mjs                # exit 1 on mismatch
 *   node scripts/check-i18n-parity.mjs --write-missing  # write empty stubs
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = join(HERE, "..", "messages")
const REFERENCE_LOCALE = "en"
const WRITE_MISSING = process.argv.includes("--write-missing")

function loadLocaleKeys(file) {
  const raw = JSON.parse(readFileSync(file, "utf8"))
  const keys = []
  function walk(node, path) {
    if (node === null || typeof node !== "object") return
    for (const [k, v] of Object.entries(node)) {
      const next = path ? `${path}.${k}` : k
      if (v && typeof v === "object" && !Array.isArray(v)) walk(v, next)
      else keys.push(next)
    }
  }
  walk(raw, "")
  return new Set(keys)
}

function main() {
  const files = readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => join(MESSAGES_DIR, f))
    .filter((f) => statSync(f).isFile())
    .sort()

  if (files.length === 0) {
    console.error("No locale files found in", MESSAGES_DIR)
    process.exit(2)
  }

  const referenceFile = files.find((f) => f.endsWith(`${REFERENCE_LOCALE}.json`))
  if (!referenceFile) {
    console.error(`Reference locale '${REFERENCE_LOCALE}.json' missing`)
    process.exit(2)
  }

  const reference = loadLocaleKeys(referenceFile)
  const byLocale = new Map()
  for (const file of files) byLocale.set(file, loadLocaleKeys(file))

  let hasError = false
  for (const [file, keys] of byLocale) {
    const locale = relative(MESSAGES_DIR, file).replace(/\.json$/, "")
    if (locale === REFERENCE_LOCALE) continue
    const missing = [...reference].filter((k) => !keys.has(k))
    const extra = [...keys].filter((k) => !reference.has(k))
    if (missing.length === 0 && extra.length === 0) {
      console.log(`✓ ${locale}`)
      continue
    }
    hasError = true
    console.error(`✗ ${locale}`)
    if (missing.length) {
      console.error(`    missing keys (${missing.length}):`)
      for (const k of missing) console.error(`      - ${k}`)
    }
    if (extra.length) {
      console.error(`    extra keys (${extra.length}):`)
      for (const k of extra) console.error(`      + ${k}`)
    }
    if (WRITE_MISSING) {
      writeMissing(file, missing)
      console.error("    (wrote empty stubs for missing keys)")
    }
  }

  process.exit(hasError ? 1 : 0)
}

function writeMissing(file, missing) {
  const raw = JSON.parse(readFileSync(file, "utf8"))
  for (const dotted of missing) {
    const parts = dotted.split(".")
    let cursor = raw
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i]
      if (!cursor[k] || typeof cursor[k] !== "object") cursor[k] = {}
      cursor = cursor[k]
    }
    cursor[parts[parts.length - 1]] = ""
  }
  writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`, "utf8")
}

main()
