"use client"

import { useEffect, useState } from "react"
export const CONSENT_KEY = "averianlabs-cookie-consent"
export function analyticsAllowed() {
  return typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) === "all"
}
export function useAnalyticsConsent() {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    const update = () => setAllowed(analyticsAllowed())
    update()
    window.addEventListener("cookie-consent", update)
    window.addEventListener("storage", update)
    return () => {
      window.removeEventListener("cookie-consent", update)
      window.removeEventListener("storage", update)
    }
  }, [])
  return allowed
}
export function publicAnalyticsPath(pathname: string) {
  return !/(?:^|\/)(?:account|checkout|admin|plans|assistant)(?:\/|$)/.test(pathname)
}
