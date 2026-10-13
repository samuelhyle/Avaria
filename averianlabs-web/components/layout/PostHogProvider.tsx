"use client"

import { analyticsAllowed, publicAnalyticsPath, useAnalyticsConsent } from "@/lib/privacy/consent"
import { usePathname } from "next/navigation"
import type { PostHog } from "posthog-js"
import { useEffect, useRef } from "react"

export function PostHogProvider({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  const allowed = useAnalyticsConsent()
  const instance = useRef<PostHog | null>(null)
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com"
  useEffect(() => {
    let active = true
    if (!allowed) {
      instance.current?.opt_out_capturing()
      return
    }
    if (!key) return
    import("posthog-js").then(({ default: posthog }) => {
      if (!active || !analyticsAllowed()) return
      if (!instance.current) {
        posthog.init(key, {
          api_host: host,
          capture_pageview: false,
          capture_pageleave: false,
          autocapture: false,
          disable_session_recording: true,
          disable_persistence: true,
          opt_out_capturing_by_default: true,
          person_profiles: "never",
        })
        instance.current = posthog
      }
      posthog.opt_in_capturing()
      if (publicAnalyticsPath(pathname))
        posthog.capture("$pageview", { $current_url: `${window.location.origin}${pathname}` })
    })
    return () => {
      active = false
    }
  }, [allowed, key, host, pathname])
  return <>{children}</>
}
