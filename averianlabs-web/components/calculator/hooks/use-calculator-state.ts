"use client"

/**
 * `useCalculatorState` — single source of truth for every input field the
 * calculator reads. Backed by `useState` for live updates, but mirrored to
 * the URL via `writeStateToUrl` so reloads, shares, and bookmarks keep the
 * setup. Reads initial state from `readStateFromUrl()` so a shared link
 * fills the form on first render.
 *
 * Validation lives next to the field that produced it — see
 * `useValidationState`. Saved protocols + history are persistent across
 * sessions via `useSavedProtocols` / `useHistory`, which store in
 * localStorage.
 */

import {
  RECONSTITUTION_PRESETS,
  solveReconstitution,
  SYRINGE_PRESETS,
  type SyringeSpec,
} from "@/lib/calculator"
import {
  type CalculatorTab,
  type UrlStateV1,
  readStateFromUrl,
  sanitizeState,
  syringeFromKey,
  syringeKey,
  writeStateToUrl,
} from "@/lib/calculator/url-state"
import { useCallback, useEffect, useMemo, useState } from "react"

export interface CalculatorFormState {
  tab: CalculatorTab
  vialMg: number
  solventMl: number
  doseMcg: number
  syringe: SyringeSpec
  productSlug: string | null
  storage: "frozen_minus20" | "refrigerated_2to8" | "room_temp"
  // Titration
  startMcg: number
  endMcg: number
  steps: number
  // Schedule
  weekCount: number
  dosesPerWeek: number
  // Dilution
  minPracticalDrawMl: number
}

export interface DerivedResult {
  recon: ReturnType<typeof solveReconstitution>
  valid: boolean
}

const DEFAULT_FORM_STATE: CalculatorFormState = (() => {
  const preset = RECONSTITUTION_PRESETS[0]!
  return {
    tab: "reconstitution",
    vialMg: preset.vialMg,
    solventMl: preset.solventMl,
    doseMcg: preset.doseMcg,
    syringe: SYRINGE_PRESETS[2]!,
    productSlug: "bpc-157",
    storage: "refrigerated_2to8",
    startMcg: 2500,
    endMcg: 15000,
    steps: 6,
    weekCount: 12,
    dosesPerWeek: 5,
    minPracticalDrawMl: 0.05,
  }
})()

function applyUrl(state: UrlStateV1): CalculatorFormState {
  const base: CalculatorFormState = { ...DEFAULT_FORM_STATE }
  if (state.tab) base.tab = state.tab
  if (state.vialMg) base.vialMg = state.vialMg
  if (state.solventMl) base.solventMl = state.solventMl
  if (state.doseMcg) base.doseMcg = state.doseMcg
  if (state.syringe) base.syringe = syringeFromKey(state.syringe)
  if (state.productSlug) base.productSlug = state.productSlug
  if (state.storage) base.storage = state.storage
  if (state.startMcg) base.startMcg = state.startMcg
  if (state.endMcg) base.endMcg = state.endMcg
  if (state.steps) base.steps = state.steps
  if (state.weekCount) base.weekCount = state.weekCount
  if (state.dosesPerWeek) base.dosesPerWeek = state.dosesPerWeek
  if (state.minPracticalDrawMl) base.minPracticalDrawMl = state.minPracticalDrawMl
  return base
}

function toUrl(state: CalculatorFormState): UrlStateV1 {
  return {
    v: 1,
    tab: state.tab,
    vialMg: state.vialMg,
    solventMl: state.solventMl,
    doseMcg: state.doseMcg,
    syringe: syringeKey(state.syringe),
    productSlug: state.productSlug ?? undefined,
    storage: state.storage,
    startMcg: state.startMcg,
    endMcg: state.endMcg,
    steps: state.steps,
    weekCount: state.weekCount,
    dosesPerWeek: state.dosesPerWeek,
    minPracticalDrawMl: state.minPracticalDrawMl,
  }
}

export interface UseCalculatorStateOptions {
  /** Optional override for the initial state — useful in tests. */
  initial?: Partial<CalculatorFormState>
  /** Set to false to opt out of URL persistence (e.g. tests). */
  persistUrl?: boolean
}

export interface UseCalculatorStateResult {
  state: CalculatorFormState
  set: <K extends keyof CalculatorFormState>(key: K, value: CalculatorFormState[K]) => void
  setMany: (patch: Partial<CalculatorFormState>) => void
  reset: () => void
  derived: DerivedResult
  loadedFromUrl: boolean
}

export function useCalculatorState(options: UseCalculatorStateOptions = {}): UseCalculatorStateResult {
  const { initial, persistUrl = true } = options

  const [state, setState] = useState<CalculatorFormState>(() => {
    const base = applyUrl(sanitizeState(readStateFromUrl()) ?? { v: 1 })
    return { ...base, ...initial }
  })
  const [loadedFromUrl] = useState(() => readStateFromUrl() !== null)

  // Re-persist on every change. Throttled with rAF so rapid slider drags
  // don't slam `history.replaceState` on every keystroke.
  useEffect(() => {
    if (!persistUrl) return
    let handle = 0
    handle = requestAnimationFrame(() => writeStateToUrl(toUrl(state)))
    return () => cancelAnimationFrame(handle)
  }, [state, persistUrl])

  const set = useCallback(<K extends keyof CalculatorFormState>(key: K, value: CalculatorFormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const setMany = useCallback((patch: Partial<CalculatorFormState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setState({ ...DEFAULT_FORM_STATE, ...initial }), [initial])

  const derived: DerivedResult = useMemo(() => {
    const recon = solveReconstitution({
      vialMg: state.vialMg,
      solventMl: state.solventMl,
      doseMcg: state.doseMcg,
      syringe: state.syringe,
    })
    return { recon, valid: !recon.invalid }
  }, [state.vialMg, state.solventMl, state.doseMcg, state.syringe])

  return { state, set, setMany, reset, derived, loadedFromUrl }
}
