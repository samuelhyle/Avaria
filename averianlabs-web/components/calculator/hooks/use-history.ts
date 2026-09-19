"use client"

/**
 * `useHistory` — last 10 calculations, computed by sampling the form state
 * once per distinct `inputsHash`. Backed by localStorage. Useful when the
 * user iterates on a protocol and wants to roll back.
 */

import { useCallback, useEffect, useRef, useState } from "react"

const STORAGE_KEY = "averianlabs:calculator:history:v1"
const MAX_ENTRIES = 10

export interface HistoryEntry {
  id: string
  inputs: {
    vialMg: number
    solventMl: number
    doseMcg: number
    syringeLabel: string
    productSlug?: string | null
  }
  outputs: {
    concentrationMcgPerMl: number
    volumePerDoseMl: number
    iuPerDoseSnapped: number
    totalDoses: number
  }
  timestamp: string
}

function read(): HistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function write(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // ignore
  }
}

function hashInputs(input: HistoryEntry["inputs"]): string {
  return `${input.vialMg}|${input.solventMl}|${input.doseMcg}|${input.syringeLabel}|${input.productSlug ?? ""}`
}

export function useHistory(): {
  entries: HistoryEntry[]
  push: (entry: HistoryEntry) => void
  remove: (id: string) => void
  clear: () => void
} {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const lastHash = useRef<string | null>(null)

  useEffect(() => {
    setEntries(read())
  }, [])

  const push = useCallback((entry: HistoryEntry) => {
    setEntries((prev) => {
      const hash = hashInputs(entry.inputs)
      // de-dupe identical consecutive entries
      const filtered = prev.filter((p) => hashInputs(p.inputs) !== hash)
      const next = [entry, ...filtered].slice(0, MAX_ENTRIES)
      lastHash.current = hash
      write(next)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id)
      write(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setEntries([])
    write([])
  }, [])

  return { entries, push, remove, clear }
}
