"use client"

/**
 * `useSavedProtocols` — persisted list of named setups the user has saved.
 * Backed by localStorage so the next session on the same browser still has
 * them. JSON-validated on read so a hand-edited localStorage can't crash
 * the calculator on load.
 */

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "averianlabs:calculator:saved:v1"

export interface SavedProtocol {
  id: string
  name: string
  createdAt: string // ISO
  inputs: {
    vialMg: number
    solventMl: number
    doseMcg: number
    syringeLabel: string
    productSlug?: string | null
  }
}

function read(): SavedProtocol[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((p): p is SavedProtocol =>
      p && typeof p.id === "string" && typeof p.name === "string" && typeof p.inputs === "object",
    )
  } catch {
    return []
  }
}

function write(protocols: SavedProtocol[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(protocols))
  } catch {
    // quota or private mode — fail silently, the calc still works in-memory
  }
}

export function useSavedProtocols(): {
  protocols: SavedProtocol[]
  save: (input: SavedProtocol) => void
  remove: (id: string) => void
  clear: () => void
} {
  const [protocols, setProtocols] = useState<SavedProtocol[]>([])

  useEffect(() => {
    setProtocols(read())
  }, [])

  const save = useCallback((protocol: SavedProtocol) => {
    setProtocols((prev) => {
      const next = [protocol, ...prev].slice(0, 50)
      write(next)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setProtocols((prev) => {
      const next = prev.filter((p) => p.id !== id)
      write(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setProtocols([])
    write([])
  }, [])

  return { protocols, save, remove, clear }
}
