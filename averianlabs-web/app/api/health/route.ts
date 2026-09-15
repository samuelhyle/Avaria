import { db } from "@/lib/db"
import { getServerEnv } from "@/lib/env"
import { logger } from "@/lib/logger"
import { sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Liveness/readiness probe. Checks env validity and database connectivity.
 * Returns 503 when degraded so orchestrators can act on it.
 */
export async function GET() {
  const startedAt = Date.now()
  const checks = { env: true, db: false }

  try {
    getServerEnv()
  } catch (err) {
    checks.env = false
    logger.error("health: env validation failed", { error: String(err) })
  }

  try {
    await db.execute(sql`select 1`)
    checks.db = true
  } catch (err) {
    logger.error("health: database check failed", { error: String(err) })
  }

  const ok = checks.env && checks.db
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checks,
      latencyMs: Date.now() - startedAt,
      version: process.env.npm_package_version ?? "unknown",
    },
    {
      status: ok ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  )
}
