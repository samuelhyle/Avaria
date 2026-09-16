"use client"

import { type RefObject, useEffect, useRef } from "react"

/**
 * Auto-scroll a chat list to the bottom whenever new content arrives, but
 * only while the user is still "near the bottom" of the scroll container.
 *
 * Why this exists:
 *   - The previous implementation re-ran `scrollTo({ behavior: "smooth" })`
 *     on every streamed token, which fights itself and produces visible
 *     rubber-band lag.
 *   - It only watched `content`, so tool chips and action cards could
 *     appear off-screen because no scroll trigger fired.
 *   - Smooth scrolling is desirable on the FINAL turn but harmful while
 *     streaming.
 *
 * Behaviour:
 *   - Coalesces multiple updates within a frame into one `scrollTo`.
 *   - Detects "user scrolled away from bottom" and stops auto-scrolling
 *     until they return.
 *   - Uses `auto` (instant) while streaming, `smooth` on the final turn.
 */

const NEAR_BOTTOM_PX = 80

interface UseAutoScrollOptions {
  /** Ref to the scrollable container. */
  scrollRef: RefObject<HTMLElement | null>
  /** Number of "things" that can grow (messages, tool chips, citations, action cards). */
  growthKey: number
  /** True while the assistant is still streaming. */
  isStreaming: boolean
}

export function useAutoScroll({ scrollRef, growthKey, isStreaming }: UseAutoScrollOptions) {
  const lastScrolledKey = useRef(growthKey)
  const rafRef = useRef<number | null>(null)
  const stuckAtBottom = useRef(true)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      stuckAtBottom.current = distance <= NEAR_BOTTOM_PX
    }
    el.addEventListener("scroll", onScroll, { passive: true })

    return () => el.removeEventListener("scroll", onScroll)
  }, [scrollRef])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (growthKey === lastScrolledKey.current) return
    lastScrolledKey.current = growthKey

    // If the user has scrolled up to read, don't yank them back down.
    if (!stuckAtBottom.current) return

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const node = scrollRef.current
      if (!node) return
      // `auto` during streaming avoids rubber-banding against the next
      // token. `smooth` is reserved for the final turn so the list settles.
      node.scrollTo({
        top: node.scrollHeight,
        behavior: isStreaming ? "auto" : "smooth",
      })
      rafRef.current = null
    })

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [growthKey, isStreaming, scrollRef])
}
