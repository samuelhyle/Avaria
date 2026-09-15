import { Badge } from "@/components/ui/Badge"
import { tierFor } from "@/lib/community/reputation"
import { cn } from "@/lib/utils/cn"
import { Award } from "lucide-react"
import Link from "next/link"

export interface LeaderEntry {
  id: string
  name: string | null
  image: string | null
  reputation: number
  reputationTier: string
}

interface LeaderboardProps {
  members: LeaderEntry[]
  t: (key: string) => string
}

export function Leaderboard({ members, t }: LeaderboardProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 text-sm text-ink-muted">
        {t("leaderboardEmpty")}
      </div>
    )
  }
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Award className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-ink">{t("leaderboardHeading")}</h3>
      </div>
      <p className="mb-4 text-xs text-ink-muted">{t("leaderboardSub")}</p>
      <ol className="space-y-2">
        {members.map((m, i) => {
          const tier = tierFor(m.reputation ?? 0)
          return (
            <li key={m.id} className={cn("flex items-center gap-3 text-sm")}>
              <span className="w-5 text-right font-mono text-xs text-ink-subtle">{i + 1}.</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink">
                {(m.name ?? "?")[0]?.toUpperCase()}
              </span>
              <span className="flex-1 truncate text-ink">{m.name ?? "Anonymous"}</span>
              <Badge tone={tier.color} size="sm">
                {m.reputation}
              </Badge>
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-xs text-ink-subtle">
        <Link href="/community/rules" className="hover:text-accent">
          {t("rulesLink")}
        </Link>
      </p>
    </div>
  )
}
