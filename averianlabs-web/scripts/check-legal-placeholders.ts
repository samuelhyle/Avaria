#!/usr/bin/env -S tsx
/**
 * Build-time guard against `NEXT_PUBLIC_LEGAL_*` placeholders.
 *
 * The plan's ORG-01 requires that no production build ships with
 * "FI-PENDING" / "Address pending" placeholders in the public footer. This
 * script reads `.env.local` (or the process environment) and fails the build
 * if any of those values remain placeholders.
 *
 * Skipped under `BUILD_MODE=demo` because the demo build intentionally uses
 * placeholder content to make the site runnable without external accounts.
 *
 * Usage:
 *   pnpm legal:check
 *
 * Exit codes:
 *   0 — all legal values are real (or BUILD_MODE=demo)
 *   1 — at least one placeholder detected
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const isDemoBuild = process.env.BUILD_MODE === "demo"
if (isDemoBuild) {
  console.log("[legal:check] BUILD_MODE=demo — skipping placeholder check.")
  process.exit(0)
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const text = readFileSync(path, "utf8")
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env"))
loadEnvFile(resolve(process.cwd(), ".env.local"))

const PLACEHOLDER_VALUES = new Set(["FI-PENDING", "Address pending", "PENDING", "TODO"])

const REQUIRED_LEGAL_KEYS = [
  "NEXT_PUBLIC_LEGAL_COMPANY_NAME",
  "NEXT_PUBLIC_LEGAL_BUSINESS_ID",
  "NEXT_PUBLIC_LEGAL_VAT_ID",
  "NEXT_PUBLIC_LEGAL_ADDRESS_LINE1",
  "NEXT_PUBLIC_LEGAL_ADDRESS_LINE2",
  "NEXT_PUBLIC_LEGAL_EMAIL",
] as const

const failures: string[] = []
for (const key of REQUIRED_LEGAL_KEYS) {
  const value = process.env[key]
  if (!value) {
    failures.push(`${key} is unset`)
    continue
  }
  if (PLACEHOLDER_VALUES.has(value) || value.toUpperCase().endsWith("-PENDING")) {
    failures.push(`${key}=${JSON.stringify(value)} is still a placeholder`)
  }
}

if (failures.length === 0) {
  console.log("[legal:check] all legal placeholders resolved ✓")
  process.exit(0)
}

console.error("[legal:check] legal placeholders detected:")
for (const f of failures) {
  console.error(`  - ${f}`)
}
console.error(
  "\nUpdate the matching NEXT_PUBLIC_LEGAL_* values in `.env.local` (local) and your hosting provider's env var store (production).",
)
process.exit(1)
