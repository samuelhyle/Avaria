"use client"

import { usePathname, useSearchParams } from "next/navigation"
import Script from "next/script"
import { useEffect, useState } from "react"

const CONSENT_KEY = "averianlabs-cookie-consent"

export function PostHogProvider({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com"

  const [consented, setConsented] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY)
    if (saved === "all") {
      setConsented(true)
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail === "all") setConsented(true)
    }
    window.addEventListener("cookie-consent", handler)
    return () => window.removeEventListener("cookie-consent", handler)
  }, [])

  useEffect(() => {
    if (!consented || !key || typeof window === "undefined") return
    const w = window as unknown as {
      posthog?: { capture: (event: string, opts?: Record<string, unknown>) => void }
    }
    w.posthog?.capture("$pageview", { path: pathname + (searchParams?.toString() ?? "") })
  }, [pathname, searchParams, key, consented])

  if (!key || !consented) return <>{children}</>

  return (
    <>
      <Script id="posthog-init" strategy="afterInteractive">
        {`
          !function(t,e){var o,n,p,r;e.__SV=1.2.4,e.posthog=e.posthog||function(){(e.posthog.q=e.posthog.q||[]).push(arguments)};o=t.createElement("script"),o.type="text/javascript",o.async=!0,o.src="${host}/static/array.js";n=t.getElementsByTagName("script")[0],n.parentNode.insertBefore(o,n)}(document,window);
          posthog.init("${key}",{api_host:"${host}",capture_pageview:false,person_profiles:"identified_only"});
        `}
      </Script>
      {children}
    </>
  )
}
