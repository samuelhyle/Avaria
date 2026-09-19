/**
 * `lib/calculator/url-state.ts` — share / bookmark the calculator state via the URL.
 *
 * Encode every input that defines a calculator setup so that the user can
 * reload, copy-paste, or send a link that drops the next visitor on an
 * identical setup. State is JSON → base64url → a single query parameter
 * `?calc=…` to keep the URL short.
 *
 * Versioned (`v=1`) so we can change the schema later without breaking
 * existing links. Anything unparseable degrades gracefully to defaults.
 */

import type { StorageTemp } from "@/lib/calculator/stability"
import type { SyringeSpec } from "@/lib/calculator/syringe"

export type CalculatorTab = "reconstitution" | "titration" | "dilution" | "breakeven" | "compare"

export interface UrlStateV1 {
  v: 1
  tab?: CalculatorTab
  // Reconstitution
  vialMg?: number
  solventMl?: number
  doseMcg?: number
  /** Syringe label key — looked up in `SYRINGE_PRESETS`. */
  syringe?: string
  /** Product slug — drives ceiling, stability, presets. */
  productSlug?: string
  /** Active storage target (for the stability hint). */
  storage?: StorageTemp
  // Titration
  startMcg?: number
  endMcg?: number
  steps?: number
  // Weekly schedule
  weekCount?: number
  dosesPerWeek?: number
  // Dilution
  minPracticalDrawMl?: number
  // Breakeven / compare — JSON-encoded plan list
  plansJson?: string
}

const STATE_VERSION: 1 = 1

function toBase64Url(s: string): string {
  if (typeof window !== "undefined") {
    return window.btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function fromBase64Url(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)
  if (typeof window !== "undefined") return window.atob(padded)
  return Buffer.from(padded, "base64").toString("utf8")
}

export function encodeState(state: UrlStateV1): string {
  const payload = { ...state, v: STATE_VERSION }
  return toBase64Url(JSON.stringify(payload))
}

export function decodeState(raw: string | null | undefined): UrlStateV1 | null {
  if (!raw) return null
  try {
    const json = fromBase64Url(raw)
    const parsed = JSON.parse(json) as UrlStateV1
    if (parsed.v !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function readStateFromUrl(): UrlStateV1 | null {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  return decodeState(params.get("calc"))
}

export function writeStateToUrl(state: UrlStateV1): string {
  if (typeof window === "undefined") return ""
  const params = new URLSearchParams(window.location.search)
  params.set("calc", encodeState(state))
  const next = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState(null, "", next)
  return next
}

/** Pure formatter that doesn't touch the URL — handy for React state. */
export function buildShareUrl(state: UrlStateV1): string {
  if (typeof window === "undefined") return `?calc=${encodeState(state)}`
  return `${window.location.origin}${window.location.pathname}?calc=${encodeState(state)}`
}

/**
 * Validate that a state object is well-formed. Drop keys whose values are
 * of the wrong type or out of range so a hand-crafted malicious URL can't
 * crash the calculator.
 */
export function sanitizeState(state: UrlStateV1 | null): UrlStateV1 {
  if (!state) return { v: 1 }
  const out: UrlStateV1 = { v: 1 }
  if (state.tab && ["reconstitution", "titration", "dilution", "breakeven", "compare"].includes(state.tab)) {
    out.tab = state.tab
  }
  if (state.vialMg && state.vialMg > 0 && state.vialMg < 5000) out.vialMg = state.vialMg
  if (state.solventMl && state.solventMl > 0 && state.solventMl < 1000) out.solventMl = state.solventMl
  if (state.doseMcg && state.doseMcg > 0 && state.doseMcg < 100000) out.doseMcg = state.doseMcg
  if (typeof state.syringe === "string" && state.syringe.length < 64 && /^[a-zA-Z0-9._-]+$/.test(state.syringe)) {
    out.syringe = state.syringe
  }
  if (typeof state.productSlug === "string" && state.productSlug.length < 64 && /^[a-z0-9-]+$/.test(state.productSlug)) {
    out.productSlug = state.productSlug
  }
  if (
    state.storage &&
    ["frozen_minus20", "refrigerated_2to8", "room_temp"].includes(state.storage)
  ) {
    out.storage = state.storage
  }
  if (state.startMcg && state.startMcg > 0 && state.startMcg < 100000) out.startMcg = state.startMcg
  if (state.endMcg && state.endMcg > 0 && state.endMcg < 100000) out.endMcg = state.endMcg
  if (state.steps && state.steps > 0 && state.steps < 50) out.steps = Math.floor(state.steps)
  if (state.weekCount && state.weekCount > 0 && state.weekCount < 200) out.weekCount = Math.floor(state.weekCount)
  if (state.dosesPerWeek && state.dosesPerWeek > 0 && state.dosesPerWeek < 14) {
    out.dosesPerWeek = Math.floor(state.dosesPerWeek)
  }
  if (state.minPracticalDrawMl && state.minPracticalDrawMl > 0 && state.minPracticalDrawMl < 1) {
    out.minPracticalDrawMl = state.minPracticalDrawMl
  }
  if (typeof state.plansJson === "string" && state.plansJson.length < 4096) {
    out.plansJson = state.plansJson
  }
  return out
}

export function syringeKey(s: SyringeSpec | undefined): string {
  if (!s) return "1ml-100iu"
  if (s.barrelMl === 0.3) return "0.3ml-30iu"
  if (s.barrelMl === 0.5) return "0.5ml-50iu"
  return "1ml-100iu"
}

export function syringeFromKey(key: string | undefined): SyringeSpec {
  const { SYRINGE_PRESETS } = require("@/lib/calculator/syringe") as typeof import("@/lib/calculator/syringe")
  if (key === "0.3ml-30iu") return SYRINGE_PRESETS[0]!
  if (key === "0.5ml-50iu") return SYRINGE_PRESETS[1]!
  return SYRINGE_PRESETS[2]!
}
