"use client"

import { Badge } from "@/components/ui/Badge"
import { tierFor } from "@/lib/community/reputation"
import { cn } from "@/lib/utils/cn"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { PostMarkdown } from "./PostMarkdown"
import { ReactionBar } from "./ReactionBar"
import { ReportDialog } from "./ReportDialog"

export interface PostView {
  id: string
  body: string
  status: string
  createdAt: Date | string
  authorId: string | null
  authorName: string | null
  authorReputation: number | null
}

interface PostCardProps {
  post: PostView
  isOriginal: boolean
  isAuthed: boolean
  currentUserId: string | null
  reactions: {
    helpful: number
    insightful: number
    thanks: number
    mine: { helpful: boolean; insightful: boolean; thanks: boolean }
  }
}

export function PostCard({ post, isOriginal, isAuthed, currentUserId, reactions }: PostCardProps) {
  const t = useTranslations("community")
  const tier = tierFor(post.authorReputation ?? 0)
  const isOwnPost = !!currentUserId && post.authorId === currentUserId
  const isRemoved = post.status === "removed"
  const isEdited = post.status === "edited"
  const created = new Date(post.createdAt)

  return (
    <article
      className={cn(
        "rounded-[var(--radius-lg)] border bg-surface p-5",
        isOriginal ? "border-accent/30 ring-1 ring-accent/10" : "border-line",
        isRemoved && "opacity-60",
      )}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-ink">
            {(post.authorName ?? "?")[0]?.toUpperCase()}
          </div>
          <div className="text-sm">
            <div className="font-medium text-ink">
              {post.authorName ?? "Anonymous"}
              {isOriginal ? (
                <span className="ml-2 text-xs text-ink-muted">· {t("threadOriginalPost")}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <time dateTime={created.toISOString()}>
                {created.toLocaleDateString()}{" "}
                {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </time>
              {isEdited ? (
                <Badge tone="muted" size="sm">
                  edited
                </Badge>
              ) : null}
              {post.authorName ? (
                <Badge tone={tier.color} size="sm">
                  {t(`reputation${capitalize(tier.id)}` as never)}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {isRemoved ? (
        <p className="text-sm italic text-ink-muted">{t("removedNotice")}</p>
      ) : (
        <PostMarkdown body={post.body} />
      )}

      {!isRemoved ? (
        <footer className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <ReactionBar
            postId={post.id}
            isAuthed={isAuthed}
            counts={reactions}
            mine={reactions.mine}
            isOwnPost={isOwnPost}
          />
          <ReportDialog postId={post.id} isAuthed={isAuthed} />
        </footer>
      ) : null}
    </article>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function SignInPrompt({ locale }: { locale: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-line bg-accent-soft p-4 text-sm">
      <Link href={`/${locale}/account`} className="font-medium text-accent hover:underline">
        Sign in to join the discussion →
      </Link>
    </div>
  )
}
