#!/usr/bin/env node
/**
 * Runs a command against a production server, starting one if needed.
 *
 * The accessibility smoke test, the narrow-viewport check and the runtime
 * audit all talk to a running site. Starting one by hand before each of them
 * is easy to forget, and CI has no interactive shell — so a check that
 * "assumes a server is running" silently does nothing when it is not.
 *
 * This wrapper starts `pnpm start` when nothing answers on the base URL,
 * waits for it to become ready, runs the command, and shuts the server down
 * again. If a server is already running it is left alone.
 *
 * Usage:
 *   node scripts/with-server.mjs -- pnpm test:a11y
 *   node scripts/with-server.mjs -- node scripts/check-narrow-overflow.mjs
 */
import { spawn } from "node:child_process"

const args = process.argv.slice(2)
const separator = args.indexOf("--")
if (separator === -1) {
  console.error("Usage: node scripts/with-server.mjs -- <command> [args…]")
  process.exit(2)
}
const command = args.slice(separator + 1)
if (command.length === 0) {
  console.error("No command given.")
  process.exit(2)
}

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"
const DIST = process.env.NEXT_DIST_DIR ?? ".next"
const READY_TIMEOUT_MS = 120_000

async function isUp() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(deadline) {
  while (Date.now() < deadline) {
    if (await isUp()) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

let server = null

if (await isUp()) {
  console.log(`[with-server] reusing the server already on ${BASE_URL}`)
} else {
  console.log(`[with-server] starting a production server on ${BASE_URL}`)
  server = spawn("pnpm", ["start"], {
    env: { ...process.env, NEXT_DIST_DIR: DIST },
    stdio: ["ignore", "pipe", "pipe"],
    // Its own process group: `pnpm start` spawns `next start` as a child,
    // and killing the parent alone leaves the child holding the port.
    detached: true,
  })
  server.stdout.on("data", (chunk) => {
    const text = String(chunk)
    if (process.env.WITH_SERVER_VERBOSE === "true") process.stdout.write(text)
  })
  server.stderr.on("data", (chunk) => {
    const text = String(chunk)
    if (process.env.WITH_SERVER_VERBOSE === "true") process.stderr.write(text)
  })

  const ready = await waitForServer(Date.now() + READY_TIMEOUT_MS)
  if (!ready) {
    console.error("[with-server] the server did not become ready in time.")
    try {
      process.kill(-server.pid, "SIGKILL")
    } catch {
      server.kill("SIGKILL")
    }
    process.exit(1)
  }
}

const child = spawn(command[0], command.slice(1), {
  env: process.env,
  stdio: "inherit",
})

const code = await new Promise((resolve) => {
  child.on("exit", (exitCode) => resolve(exitCode ?? 1))
})

if (server) {
  // Kill the whole process group, so `next start` goes down with `pnpm`.
  try {
    process.kill(-server.pid, "SIGKILL")
  } catch {
    server.kill("SIGKILL")
  }
}

process.exit(code)
