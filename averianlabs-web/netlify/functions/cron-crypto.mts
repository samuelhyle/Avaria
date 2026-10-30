/**
 * Scheduled entry point for the crypto watcher.
 *
 * The watcher polls the configured chains for deposits, matches them to open
 * invoices, marks the orders paid and queues the buyer and team notifications.
 * It runs on its own, more frequent schedule than the maintenance cron because
 * a customer is waiting to be told their payment landed.
 *
 * The route authenticates with `Authorization: Bearer $CRON_SECRET`; a Netlify
 * scheduled invocation cannot carry custom headers, so this wrapper adds them.
 */

interface ScheduledRequest extends Request {
  json(): Promise<{ next_run?: string }>
}

export default async function handler(request: ScheduledRequest) {
  const origin = process.env.URL
  const secret = process.env.CRON_SECRET
  if (!origin || !secret) {
    console.error("[cron] URL or CRON_SECRET is not configured")
    return new Response("not configured", { status: 500 })
  }
  const target = `${origin.replace(/\/$/, "")}/api/cron/crypto`
  try {
    const response = await fetch(target, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(25_000),
    })
    const body = await response.text()
    if (!response.ok) {
      console.error(`[cron] crypto failed: ${response.status} ${body}`)
      return new Response(body, { status: response.status })
    }
    console.log(`[cron] crypto ok: ${body}`)
    return new Response(body, { status: 200 })
  } catch (error) {
    console.error("[cron] crypto request failed", error)
    return new Response("failed", { status: 500 })
  }
}

export const config = {
  schedule: "*/2 * * * *",
}
