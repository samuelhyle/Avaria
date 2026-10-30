"use client"

import { cn } from "@/lib/utils/cn"
import { useTranslations } from "next-intl"
import { type ReactNode, useEffect, useId, useRef, useState } from "react"

export interface ProductTab {
  id: string
  label: string
  content: ReactNode
}

/**
 * Accessible tab strip used on the product page. Arrow keys move between
 * tabs, and every panel stays reachable by keyboard.
 *
 * `initialTab` opens a specific panel from a shared link, so a link to a
 * product's certificates lands on the certificates rather than on the first
 * tab. The fragment in the URL is scrolled to once the panel is open.
 */
export function ProductTabs({ tabs, initialTab }: { tabs: ProductTab[]; initialTab?: string }) {
  const t = useTranslations("product")
  const [active, setActive] = useState(() => {
    const requested = initialTab ? tabs.find((tab) => tab.id === initialTab) : undefined
    return requested?.id ?? tabs[0]?.id ?? ""
  })
  const baseId = useId()
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0]

  // A shared link may point at a fragment inside the panel that was opened.
  // The target can be hidden until its tab is active, so this runs on tab
  // changes — but only once per fragment. Re-running it on every tab change
  // scrolled the page back to a hidden element and stole focus from the tab.
  const handledFragment = useRef<string | null>(null)
  useEffect(() => {
    if (typeof window === "undefined") return
    const fragment = window.location.hash.slice(1)
    if (!fragment) return
    if (handledFragment.current === fragment) return
    const target = document.getElementById(fragment)
    if (!target) return
    handledFragment.current = fragment
    target.scrollIntoView({ block: "start" })
    target.focus({ preventScroll: true })
  }, [])

  if (!current) return null

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === active)
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      setActive(tabs[(index + 1) % tabs.length]?.id ?? active)
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      setActive(tabs[(index - 1 + tabs.length) % tabs.length]?.id ?? active)
    }
    if (event.key === "Home") {
      event.preventDefault()
      setActive(tabs[0]?.id ?? active)
    }
    if (event.key === "End") {
      event.preventDefault()
      setActive(tabs[tabs.length - 1]?.id ?? active)
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("tabsLabel")}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-1 border-b border-line"
      >
        {tabs.map((tab) => {
          const selected = tab.id === current.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                "-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                selected
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== current.id}
          className="pt-6 focus-visible:outline-none"
        >
          {tab.content}
        </div>
      ))}
    </div>
  )
}
