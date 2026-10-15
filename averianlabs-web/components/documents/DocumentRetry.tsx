"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

export function DocumentRetry() {
  const t = useTranslations("documentLibrary")
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink disabled:opacity-60"
    >
      {t(pending ? "retrying" : "retry")}
    </button>
  )
}
