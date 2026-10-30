"use client"

import { useEffect, useState } from "react"

/**
 * The keyboard-shortcut hint for the search palette.
 *
 * The palette opens with ⌘K on macOS and Ctrl+K everywhere else. Showing
 * "⌘K" to a Windows or Linux visitor was wrong — the key they have to press
 * does not exist on their keyboard. The hint is read on the client, so it
 * renders the neutral "Ctrl K" until the platform is known; a wrong glyph
 * that flashes and swaps is worse than a correct one that arrives a frame
 * later.
 */
export function ShortcutHint({ className }: { className?: string }) {
  const [label, setLabel] = useState("Ctrl K")

  useEffect(() => {
    const platform =
      typeof navigator === "undefined" ? "" : (navigator.platform ?? navigator.userAgent ?? "")
    const isApple = /mac|iphone|ipad|ipod/i.test(platform)
    if (isApple) setLabel("⌘K")
  }, [])

  return (
    <span className={className} aria-hidden>
      {label}
    </span>
  )
}
