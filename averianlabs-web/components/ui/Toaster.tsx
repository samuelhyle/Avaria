"use client"

import { useTheme } from "next-themes"
import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  const { resolvedTheme } = useTheme()
  return (
    <SonnerToaster
      position="bottom-right"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastOptions={{
        classNames: {
          toast: "bg-surface text-ink border border-line shadow-lg rounded-[var(--radius)]",
          title: "text-ink font-medium",
          description: "text-ink-muted",
          success: "bg-success-soft text-success border-success/30",
          error: "bg-danger-soft text-danger border-danger/30",
        },
      }}
    />
  )
}
