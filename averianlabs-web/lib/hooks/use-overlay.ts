"use client"

import { type RefObject, useEffect, useRef } from "react"

interface UseOverlayOptions {
  open: boolean
  onClose: () => void
  /** Optional element to focus on open (defaults to first focusable child). */
  initialFocusRef?: RefObject<HTMLElement | null>
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

/**
 * Modal overlay behaviour: Escape to close, Tab focus trap, initial focus,
 * focus return to the trigger, and background scroll lock. Attach the returned
 * ref to the overlay container and give it `role="dialog" aria-modal="true"`.
 */
export function useOverlay<T extends HTMLElement = HTMLDivElement>({
  open,
  onClose,
  initialFocusRef,
}: UseOverlayOptions): RefObject<T | null> {
  const containerRef = useRef<T | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const container = containerRef.current
    returnFocusRef.current = document.activeElement as HTMLElement | null

    const target = initialFocusRef?.current ?? getFocusable(container)[0] ?? container
    if (target && "focus" in target) target.focus()

    const background: Array<{ element: HTMLElement; inert: boolean }> = []
    let branch: HTMLElement | null = container
    while (branch && branch !== document.body) {
      const parent: HTMLElement | null = branch.parentElement
      for (const sibling of Array.from(parent?.children ?? [])) {
        if (
          sibling !== branch &&
          sibling instanceof HTMLElement &&
          !["SCRIPT", "STYLE"].includes(sibling.tagName)
        ) {
          background.push({ element: sibling, inert: sibling.inert })
          sibling.inert = true
        }
      }
      branch = parent
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== "Tab") return
      const focusables = getFocusable(container)
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (!first || !last) return
      if (e.shiftKey && (active === first || !container?.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !container?.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      for (const { element, inert } of background) element.inert = inert
      document.body.style.overflow = previousOverflow
      returnFocusRef.current?.focus?.()
    }
  }, [open, initialFocusRef])

  return containerRef
}
