import { create } from "zustand"

interface SearchPaletteState {
  open: boolean
  setOpen: (open: boolean) => void
}

/** Transient UI state only. A request survives a lazily loaded consumer mounting later. */
export const useSearchPalette = create<SearchPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))

export function requestSearchPalette() {
  useSearchPalette.getState().setOpen(true)
}

export function toggleSearchPalette() {
  const state = useSearchPalette.getState()
  state.setOpen(!state.open)
}

/** Register from the hydrated header, independently of the lazy palette. */
export function registerSearchShortcut(target: EventTarget): () => void {
  const handler = (event: Event) => {
    const key = event as KeyboardEvent
    if (key.defaultPrevented || key.repeat || key.altKey) return
    if ((key.metaKey || key.ctrlKey) && key.key.toLowerCase() === "k") {
      key.preventDefault()
      toggleSearchPalette()
    }
  }
  // Capture before cmdk can consume Ctrl+K as a list-navigation binding.
  target.addEventListener("keydown", handler, { capture: true })
  return () => target.removeEventListener("keydown", handler, { capture: true })
}
