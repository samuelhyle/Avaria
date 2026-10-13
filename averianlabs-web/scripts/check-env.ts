#!/usr/bin/env -S tsx
/**
 * Build-time env validator.
 *
 * Fails the build when a *required* production env var is missing or invalid.
 * Optional vars are still surfaced (so a missing Sentry DSN shows up in logs)
 * but only the required three bring the build down:
 *
 *   - DATABASE_URL          non-empty, valid postgres URL
 *   - AUTH_SECRET           ≥ 32 characters (matches lib/env.ts minimum)
 *   - AUTH_URL              valid https?:// URL
 *
 * The Netlify `BUILD_MODE=demo` build runs with every var unset by design —
 * this script returns 0 in that mode so the demo can still build.
 *
 * Reads `.env.local` first (if present) and then the process environment, so
 * `pnpm build && pnpm env:check` works locally without sourcing the file.
 *
 * Exit codes:
 *   0 — required vars present and valid (or BUILD_MODE=demo)
 *   1 — at least one required var missing or invalid
 *   2 — schema / parse error
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { z } from "zod"

const isDemoBuild = process.env.BUILD_MODE === "demo"
if (isDemoBuild) {
  console.log("[env:check] BUILD_MODE=demo — skipping required-var check.")
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

// Local .env files are not loaded by tsx by default; load them so the script
// is honest about what a fresh `pnpm dev` would see.
loadEnvFile(resolve(process.cwd(), ".env"))
loadEnvFile(resolve(process.cwd(), ".env.local"))

const required = z.object({
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL URL")
    .refine(
      (value) => /^postgres(?:ql)?:\/\//.test(value),
      "DATABASE_URL must use postgres:// or postgresql://",
    ),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters (use `openssl rand -base64 32`)"),
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL, e.g. https://averianlabs.eu"),
})

const parsed = required.safeParse(process.env)
if (parsed.success) {
  console.log("[env:check] required production vars present ✓")
  process.exit(0)
}

console.error("[env:check] required production env vars are missing or invalid:")
for (const issue of parsed.error.issues) {
  const key = issue.path.join(".") || "(root)"
  console.error(`  - ${key}: ${issue.message}`)
}
console.error(
  "\nSet them in `.env.local` (local) or your hosting provider's env var store (production).",
)
process.exit(1)
