import { beforeEach, describe, expect, it } from "vitest"
import {
  registerSearchShortcut,
  requestSearchPalette,
  toggleSearchPalette,
  useSearchPalette,
} from "./palette"

function keyEvent(
  options: {
    key?: string
    ctrlKey?: boolean
    metaKey?: boolean
    altKey?: boolean
    repeat?: boolean
  } = {},
) {
  return Object.assign(new Event("keydown", { cancelable: true }), {
    key: "k",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
    ...options,
  })
}

beforeEach(() => useSearchPalette.getState().setOpen(false))

describe("transient search palette requests", () => {
  it("retains an early request before a consumer exists, without browser storage", () => {
    expect(typeof window).toBe("undefined")
    requestSearchPalette()
    // The lazy consumer reads this snapshot when it finally mounts.
    expect(useSearchPalette.getState().open).toBe(true)
    const observed: boolean[] = []
    const unsubscribe = useSearchPalette.subscribe((state) => observed.push(state.open))
    useSearchPalette.getState().setOpen(false)
    expect(observed).toEqual([false])
    unsubscribe()
  })
  it("supports explicit close and shortcut toggling without losing the next open request", () => {
    toggleSearchPalette()
    expect(useSearchPalette.getState().open).toBe(true)
    toggleSearchPalette()
    expect(useSearchPalette.getState().open).toBe(false)
    requestSearchPalette()
    useSearchPalette.getState().setOpen(false)
    requestSearchPalette()
    expect(useSearchPalette.getState().open).toBe(true)
  })
  it("handles Ctrl/Cmd+K once, ignores repeats and removes its listener", () => {
    const target = new EventTarget()
    const dispose = registerSearchShortcut(target)
    target.dispatchEvent(keyEvent())
    expect(useSearchPalette.getState().open).toBe(false)
    const control = keyEvent({ ctrlKey: true })
    target.dispatchEvent(control)
    expect(control.defaultPrevented).toBe(true)
    expect(useSearchPalette.getState().open).toBe(true)
    target.dispatchEvent(keyEvent({ ctrlKey: true, repeat: true }))
    target.dispatchEvent(keyEvent({ ctrlKey: true, altKey: true }))
    expect(useSearchPalette.getState().open).toBe(true)
    target.dispatchEvent(keyEvent({ metaKey: true, key: "K" }))
    expect(useSearchPalette.getState().open).toBe(false)
    dispose()
    const afterCleanup = keyEvent({ ctrlKey: true })
    target.dispatchEvent(afterCleanup)
    expect(afterCleanup.defaultPrevented).toBe(false)
    expect(useSearchPalette.getState().open).toBe(false)
  })
  it("respects a shortcut already consumed by another control", () => {
    const target = new EventTarget()
    const event = keyEvent({ ctrlKey: true })
    event.preventDefault()
    const dispose = registerSearchShortcut(target)
    target.dispatchEvent(event)
    expect(useSearchPalette.getState().open).toBe(false)
    dispose()
  })
})
