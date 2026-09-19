"use client"

import { cn } from "@/lib/utils/cn"
import { Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export interface ConversationSearchProps {
  initialQ?: string
  initialLocale?: string
  className?: string
}

export function ConversationSearch({
  initialQ = "",
  initialLocale,
  className,
}: ConversationSearchProps) {
  const router = useRouter()
  const params = useSearchParams()
  const t = useTranslations("admin.conversationSearch")
  const [q, setQ] = useState(initialQ)
  const [locale, setLocale] = useState(initialLocale ?? "")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = new URLSearchParams(params?.toString() ?? "")
    if (q.trim()) next.set("q", q.trim())
    else next.delete("q")
    if (locale) next.set("locale", locale)
    else next.delete("locale")
    router.push(`?${next.toString()}`)
  }

  return (
    <form onSubmit={submit} className={cn("flex flex-wrap gap-2", className)}>
      <div className="relative flex-1 min-w-[200px]">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("placeholder")}
          className="w-full rounded-[var(--radius)] border border-line bg-surface py-2 pl-9 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <option value="">{t("allLocales")}</option>
        <option value="en">{t("english")}</option>
        <option value="fi">{t("finnish")}</option>
        <option value="de">{t("german")}</option>
        <option value="sv">{t("swedish")}</option>
        <option value="nl">{t("dutch")}</option>
      </select>
      <button
        type="submit"
        className="rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
      >
        {t("submit")}
      </button>
    </form>
  )
}
