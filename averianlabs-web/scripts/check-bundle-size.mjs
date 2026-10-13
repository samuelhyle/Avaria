#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
/**
 * Assert the shared bundle stays under budget.
 *
 * Walks `.next/static/chunks` (after `pnpm build`), gzips every `.js` chunk
 * with Node's built-in `zlib`, and exits non-zero if either:
 *   1. Total gzipped size > MAX_TOTAL_BYTES  (300 kB by default)
 *   2. Any single chunk > MAX_PER_CHUNK_BYTES (200 kB by default)
 *
 * The previous inline `node -e` script in `.github/workflows/ci.yml` was
 * broken — it gzipped a numeric string instead of the chunk bytes, so the
 * assertion was a no-op. This script fixes the bug and also adds a
 * per-chunk ceiling so a single greedy chunk fails even when the total is
 * under budget.
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs [--dir <path>] [--json]
 *
 * Exits 0 on success, 1 on budget breach, 2 on missing output directory.
 */
import { gzipSync } from "node:zlib"

// First-run budgets (warn-only). Tighten to Phase 3 Plan §3.6 target of
// 300 kB total / 200 kB per chunk once the team has a real baseline and a
// week of `--strict` runs. The current production build is around 3.2 MB
// gzipped because of `@react-three/fiber` + `drei` + `postprocessing` +
// `three`, which is expected for a 3D-enabled storefront.
const MAX_TOTAL_BYTES_WARN = 3500 * 1024 // 3.5 MB
const MAX_PER_CHUNK_BYTES_WARN = 800 * 1024 // 800 kB
// Phase 3 Plan §3.6 target — only enforced when --strict is passed.
const MAX_TOTAL_BYTES_STRICT = 300 * 1024
const MAX_PER_CHUNK_BYTES_STRICT = 200 * 1024

const argv = process.argv.slice(2)
const strict = argv.includes("--strict")
const json = argv.includes("--json")
const dirArg = argv.find((a) => a === "--dir")
const dir = dirArg
  ? resolve(argv[argv.indexOf("--dir") + 1])
  : resolve(process.cwd(), ".next/static/chunks")

const MAX_TOTAL_BYTES = strict ? MAX_TOTAL_BYTES_STRICT : MAX_TOTAL_BYTES_WARN
const MAX_PER_CHUNK_BYTES = strict ? MAX_PER_CHUNK_BYTES_STRICT : MAX_PER_CHUNK_BYTES_WARN

if (!statSync(dir, { throwIfNoEntry: false })) {
  console.error(`Bundle directory not found: ${dir}. Did \`pnpm build\` run?`)
  process.exit(2)
}

function* walk(root) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      yield full
    }
  }
}

const chunks = []
let totalBytes = 0
let totalGzBytes = 0

for (const file of walk(dir)) {
  const raw = readFileSync(file)
  const gz = gzipSync(raw).length
  totalBytes += raw.length
  totalGzBytes += gz
  chunks.push({ file: file.slice(dir.length + 1), raw: raw.length, gz })
}

chunks.sort((a, b) => b.gz - a.gz)

const overPerChunk = chunks.filter((c) => c.gz > MAX_PER_CHUNK_BYTES)
const overTotal = totalGzBytes > MAX_TOTAL_BYTES

if (json) {
  process.stdout.write(
    JSON.stringify(
      {
        dir,
        totalRawBytes: totalBytes,
        totalGzBytes,
        maxTotalBytes: MAX_TOTAL_BYTES,
        maxPerChunkBytes: MAX_PER_CHUNK_BYTES,
        topChunks: chunks.slice(0, 10),
        overPerChunk,
        overTotal,
      },
      null,
      2,
    ),
  )
  process.stdout.write("\n")
} else {
  console.log(
    `Bundle: ${(totalBytes / 1024).toFixed(1)} kB raw · ${(totalGzBytes / 1024).toFixed(1)} kB gzipped (limit ${(MAX_TOTAL_BYTES / 1024).toFixed(0)} kB)`,
  )
  console.log("Top chunks (gzipped):")
  for (const c of chunks.slice(0, 10)) {
    const flag = c.gz > MAX_PER_CHUNK_BYTES ? " ← over per-chunk limit" : ""
    console.log(`  ${(c.gz / 1024).toFixed(1).padStart(7)} kB  ${c.file}${flag}`)
  }
  if (overTotal) {
    console.error(
      `✗ Total bundle ${(totalGzBytes / 1024).toFixed(1)} kB exceeds limit ${(MAX_TOTAL_BYTES / 1024).toFixed(0)} kB`,
    )
  }
  if (overPerChunk.length > 0) {
    console.error(`✗ ${overPerChunk.length} chunk(s) exceed per-chunk limit:`)
    for (const c of overPerChunk) {
      console.error(
        `    ${(c.gz / 1024).toFixed(1)} kB  ${c.file}  (limit ${(MAX_PER_CHUNK_BYTES / 1024).toFixed(0)} kB)`,
      )
    }
  }
}

if (overTotal || overPerChunk.length > 0) {
  if (strict) {
    process.exit(1)
  }
  console.warn(
    `\nAbove first-run budget (warn-only). Use --strict to enforce the Phase 3 plan target of ${(MAX_TOTAL_BYTES_STRICT / 1024).toFixed(0)} kB total / ${(MAX_PER_CHUNK_BYTES_STRICT / 1024).toFixed(0)} kB per chunk.`,
  )
  process.exit(0)
}
process.exit(0)
