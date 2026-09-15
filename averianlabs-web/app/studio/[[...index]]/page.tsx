"use client"

import dynamic from "next/dynamic"

const StudioLoader = dynamic(() => import("./StudioLoader"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="text-sm text-ink-muted">Loading studio…</div>
    </div>
  ),
})

export default function StudioPage() {
  return <StudioLoader />
}
