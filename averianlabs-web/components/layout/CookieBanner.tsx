"use client"
import { Cookie } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
const STORAGE_KEY = "averianlabs-cookie-consent"
export function CookieBanner({ locale: _locale }: { locale: string }) {
  const t = useTranslations("cookie")
  const [show, setShow] = useState(false)
  useEffect(() => {
    const update = () => {
      let saved: string | null = null
      try {
        saved = localStorage.getItem(STORAGE_KEY)
      } catch {
        /* Cookie fallback keeps settings usable when browser storage is blocked. */
      }
      saved ??=
        document.cookie
          .split("; ")
          .find((c) => c.startsWith(`${STORAGE_KEY}=`))
          ?.split("=")[1] ?? null
      const ageConfirmed = document.cookie
        .split("; ")
        .some((c) => c.startsWith("averianlabs-age-confirmed="))
      setShow(
        ageConfirmed && (!saved || !!document.documentElement.dataset.cookieSettingsRequested),
      )
      delete document.documentElement.dataset.cookieSettingsRequested
    }
    const reopen = () => {
      document.documentElement.dataset.cookieSettingsRequested = "true"
      update()
    }
    update()
    window.addEventListener("cookie-settings", reopen)
    window.addEventListener("averianlabs:age-confirmed", update)
    return () => {
      window.removeEventListener("cookie-settings", reopen)
      window.removeEventListener("averianlabs:age-confirmed", update)
    }
  }, [])
  const persist = (value: "all" | "essential") => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* Consent can still be held in the first-party cookie. */
    }
    document.cookie = `${STORAGE_KEY}=${value}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`
    setShow(false)
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: value }))
  }
  if (!show) return null
  return (
    <section
      role="dialog"
      aria-labelledby="cookie-settings-title"
      aria-describedby="cookie-settings-description"
      className="fixed inset-x-0 bottom-[calc(1rem+var(--platform-bottom-inset,0px)+env(safe-area-inset-bottom))] z-40 mx-auto w-[calc(100%-2rem)] max-w-2xl rounded-xl border border-line bg-surface p-5 shadow-xl sm:p-6"
    >
      <div className="flex gap-3">
        <Cookie aria-hidden className="mt-1 h-5 w-5 shrink-0 text-accent" />
        <div>
          <h2 id="cookie-settings-title" className="text-base font-semibold">
            {t("title")}
          </h2>
          <p
            id="cookie-settings-description"
            className="mt-2 text-sm leading-relaxed text-ink-muted"
          >
            {t("body")}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => persist("essential")}
          className="min-h-11 flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2 sm:flex-none"
        >
          {t("reject")}
        </button>
        <button
          type="button"
          onClick={() => persist("all")}
          className="min-h-11 flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover sm:flex-none"
        >
          {t("accept")}
        </button>
      </div>
    </section>
  )
}
