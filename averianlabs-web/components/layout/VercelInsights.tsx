"use client"

import { analyticsAllowed, publicAnalyticsPath, useAnalyticsConsent } from "@/lib/privacy/consent"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { usePathname } from "next/navigation"

export function VercelInsights() {
  const allowed = useAnalyticsConsent()
  const pathname = usePathname()
  if (!process.env.NEXT_PUBLIC_VERCEL_ENV || !allowed || !publicAnalyticsPath(pathname)) return null
  const clean = <T extends { url: string }>(event: T): T | null => {
    if (!analyticsAllowed()) return null
    const url = new URL(event.url)
    if (!publicAnalyticsPath(url.pathname)) return null
    return { ...event, url: `${url.origin}${url.pathname}` }
  }
  return (
    <>
      <Analytics beforeSend={clean} />
      <SpeedInsights beforeSend={clean} />
    </>
  )
}
