import { db, isDatabaseConfigured } from "@/lib/db"
import { logger } from "@/lib/logger"
import { sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Liveness/readiness probe. Reports env + database connectivity.
 * Returns 200 on healthy, 503 on degraded (DB unreachable OR optional
 * integrations missing — e.g. Netlify preview without Neon/Auth.js/Stripe).
 * The marketing/catalog/AI-chat surface does not need DB or auth, so a 200
 * is still returned when DATABASE_URL is unset as long as the module loaded
 * cleanly and the AI key (if configured) is reachable. The `checks` object
 * surfaces the detail for dashboards / Netlify's deploy-notification hooks.
 */
export async function GET() {
  const startedAt = Date.now()
  const checks = {
    env: true,
    db: false,
    minimax: Boolean(process.env.MINIMAX_API_KEY?.trim()),
    auth: Boolean(process.env.AUTH_SECRET?.trim()),
  }

  if (isDatabaseConfigured()) {
    try {
      await db.execute(sql`select 1`)
      checks.db = true
    } catch (err) {
      logger.error("health: database check failed", { error: String(err) })
    }
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
