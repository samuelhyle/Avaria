"use client"

import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

// These both render `null` and inject their scripts client-side only, so they
// are hydration-safe. The Next-specific entry points wrap their internals in
// a client Suspense boundary, which React 19 flags as a hydration mismatch.
//
// The first-party script routes (`/_vercel/insights/*`) only exist on Vercel
// deployments, so mount them only there — otherwise local/self-hosted builds
// log noisy 404s for both scripts.
const onVercel = Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV)

export function VercelInsights() {
  if (!onVercel) return null

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
