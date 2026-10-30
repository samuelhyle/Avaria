/**
 * Scheduled entry point for the maintenance cron.
 *
 * The site is served from Netlify, so the schedule lives here rather than in a
 * GitHub workflow: a scheduled function runs on the same deployment as the code
 * it calls, with no external scheduler to keep alive and no repository variable
 * to remember to set.
 *
 * The cron route authenticates with `Authorization: Bearer $CRON_SECRET`. A
 * Netlify scheduled invocation cannot carry custom headers, so this wrapper
 * adds them. `URL` is the deployment's own origin, supplied by Netlify.
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
  const target = `${origin.replace(/\/$/, "")}/api/cron/maintenance`
  try {
    const response = await fetch(target, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(25_000),
    })
    const body = await response.text()
    if (!response.ok) {
      console.error(`[cron] maintenance failed: ${response.status} ${body}`)
      return new Response(body, { status: response.status })
    }
    console.log(`[cron] maintenance ok: ${body}`)
    return new Response(body, { status: 200 })
  } catch (error) {
    console.error("[cron] maintenance request failed", error)
    return new Response("failed", { status: 500 })
  }
}

export const config = {
  schedule: "*/5 * * * *",
}
