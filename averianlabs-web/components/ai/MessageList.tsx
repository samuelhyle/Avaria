"use client"

import { HelixGlyph } from "@/components/ai/icons/HelixGlyph"
import type { CitationRef } from "@/lib/ai/types"
import {
  type ActionResolution,
  type ProposedAction,
  type ProposedActionAddToCart,
  proposedActionKey,
} from "@/lib/ai/types/events"
import { cn } from "@/lib/utils/cn"
import {
  Beaker,
  Calculator,
  Check,
  ExternalLink,
  FlaskConical,
  Package,
  Search,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Truck,
  UserPlus,
  X,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export type { ProposedAction, ProposedActionAddToCart, ActionResolution }

export interface ToolTrace {
  id: string
  name: string
  args: unknown
  result?: unknown
}

interface ProductCardData {
  slug: string
  name: string
  url: string
  purityPercent: number | null
  fromPriceCents: number | null
}

/** Extract renderable product data from completed tool calls. */
function extractProducts(trace?: ToolTrace[]): ProductCardData[] {
  if (!trace || trace.length === 0) return []
  const out = new Map<string, ProductCardData>()

  const minPrice = (vials: Array<{ priceCents?: number }>): number | null => {
    const prices = vials
      .map((v) => v.priceCents)
      .filter((c): c is number => typeof c === "number" && c > 0)
    return prices.length > 0 ? Math.min(...prices) : null
  }

  for (const t of trace) {
    if (t.result === undefined || t.result === null) continue
    const r = t.result as Record<string, unknown>

    if (t.name === "searchProducts" && Array.isArray(r.results)) {
      for (const item of r.results as Array<Record<string, unknown>>) {
        const slug = typeof item.slug === "string" ? item.slug : null
        const name = typeof item.name === "string" ? item.name : null
        if (!slug || !name) continue
        out.set(slug, {
          slug,
          name,
          url: typeof item.url === "string" ? item.url : `/shop/${slug}`,
          purityPercent: typeof item.purityPercent === "number" ? item.purityPercent : null,
          fromPriceCents: Array.isArray(item.vials)
            ? minPrice(item.vials as Array<{ priceCents?: number }>)
            : null,
        })
      }
    } else if (
      t.name === "getProduct" &&
      typeof r.slug === "string" &&
      typeof r.name === "string"
    ) {
      out.set(r.slug, {
        slug: r.slug,
        name: r.name,
        url: typeof r.url === "string" ? r.url : `/shop/${r.slug}`,
        purityPercent: typeof r.purityPercent === "number" ? r.purityPercent : null,
        fromPriceCents: Array.isArray(r.vials)
          ? minPrice(r.vials as Array<{ priceCents?: number }>)
          : null,
      })
    } else if (t.name === "compareProducts" && Array.isArray(r.products)) {
      for (const item of r.products as Array<Record<string, unknown>>) {
        const slug = typeof item.slug === "string" ? item.slug : null
        const name = typeof item.name === "string" ? item.name : null
        if (!slug || !name) continue
        out.set(slug, {
          slug,
          name,
          url: typeof item.url === "string" ? item.url : `/shop/${slug}`,
          purityPercent: typeof item.purityPercent === "number" ? item.purityPercent : null,
          fromPriceCents: typeof item.fromPriceCents === "number" ? item.fromPriceCents : null,
        })
      }
    }
  }

  return Array.from(out.values()).slice(0, 4)
}

function InlineProducts({ products }: { products: ProductCardData[] }) {
  const t = useTranslations("averia")
  return (
    <ul className="flex flex-col gap-1.5">
      {products.map((p) => (
        <li key={p.slug}>
          <Link href={p.url} className="block" prefetch={false}>
            <span className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-3 py-2 transition-colors hover:border-accent/40 hover:bg-accent-soft/40">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-ink">{p.name}</span>
                <span className="block text-3xs text-ink-muted">
                  {p.purityPercent !== null ? `${p.purityPercent.toFixed(1)}% HPLC · ` : ""}
                  {p.fromPriceCents !== null ? `${(p.fromPriceCents / 100).toFixed(2)} €` : ""}
                </span>
              </span>
              <span className="shrink-0 text-3xs font-medium text-accent">{t("viewProduct")}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  citations?: CitationRef[]
  toolTrace?: ToolTrace[]
  proposedActions?: ProposedAction[]
  resolvedActions?: Record<string, ActionResolution>
  feedback?: "up" | "down"
}

export interface MessageProps {
  message: ChatMessage
  isStreaming?: boolean
  onConfirmAction?: (action: ProposedAction, messageId: string) => void
  onDismissAction?: (action: ProposedAction, messageId: string) => void
  onFeedback?: (messageId: string, feedback: "up" | "down") => void
}

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  searchProducts: Search,
  getProduct: Package,
  getBatches: Beaker,
  compareProducts: FlaskConical,
  getReconstitution: Calculator,
  viewCart: ShoppingCart,
  addToCart: ShoppingCart,
  escalateToHuman: ShieldAlert,
}

function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = TOOL_ICONS[name] ?? FlaskConical
  return <Icon className={className} />
}

/**
 * Turn `[1]`-style citation markers into markdown links that point at the
 * citation chip URLs, and strip any leftover `[cite:…]` syntax. Also hides
 * model reasoning blocks (`<think>…</think>`) — including the unclosed tail
 * while the response is still streaming.
 */
function linkCitations(content: string, citations?: CitationRef[]): string {
  let out = content.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "")
  out = out.replace(/\[cite:[^\]]*\]/g, "")
  if (citations && citations.length > 0) {
    out = out.replace(/\[(\d{1,2})\](?!\()/g, (match, digits: string) => {
      const citation = citations.find((c) => c.index === Number(digits))
      return citation?.url ? `[${digits}](${citation.url})` : match
    })
  }
  return out.replace(/[ \t]{2,}/g, " ").trimStart()
}

export function Message({
  message,
  isStreaming,
  onConfirmAction,
  onDismissAction,
  onFeedback,
}: MessageProps) {
  const isUser = message.role === "user"
  const products = isUser ? [] : extractProducts(message.toolTrace)
  const renderedContent = isUser
    ? message.content
    : linkCitations(message.content, message.citations)

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[85%] rounded-2xl rounded-br-md bg-accent-soft px-4 py-2.5 text-sm text-ink shadow-sm",
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <HelixGlyph className="h-4 w-4" />
      </div>
      <div className="flex max-w-[85%] flex-col gap-2">
        {message.toolTrace && message.toolTrace.length > 0 ? (
          <ToolTraceList trace={message.toolTrace} />
        ) : null}
        {message.content ? (
          <div
            className={cn(
              "rounded-2xl rounded-tl-md border border-line/60 bg-surface px-4 py-2.5 text-sm text-ink shadow-sm",
            )}
          >
            <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-sm prose-headings:font-semibold prose-strong:text-ink prose-code:rounded prose-code:bg-surface-2 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:my-2 prose-pre:bg-surface-2 prose-pre:text-xs prose-table:my-2 prose-th:text-left prose-th:font-medium prose-td:align-top">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{renderedContent}</ReactMarkdown>
              {isStreaming ? (
                <span
                  className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-accent"
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        ) : null}
        {message.proposedActions && message.proposedActions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {message.proposedActions.map((a) => (
              <ActionCard
                key={proposedActionKey(a)}
                action={a}
                resolved={message.resolvedActions?.[proposedActionKey(a)]}
                onConfirm={() => onConfirmAction?.(a, message.id)}
                onDismiss={() => onDismissAction?.(a, message.id)}
              />
            ))}
          </div>
        ) : null}
        {!isStreaming && products.length > 0 ? <InlineProducts products={products} /> : null}
        {message.citations && message.citations.length > 0 && !isStreaming ? (
          <CitationChips citations={message.citations} />
        ) : null}
        {!isStreaming && message.content ? (
          <FeedbackBar
            feedback={message.feedback}
            onFeedback={(fb) => onFeedback?.(message.id, fb)}
          />
        ) : null}
      </div>
    </div>
  )
}

function FeedbackBar({
  feedback,
  onFeedback,
}: {
  feedback?: "up" | "down"
  onFeedback: (feedback: "up" | "down") => void
}) {
  const t = useTranslations("averia")
  return (
    <div className="flex items-center gap-1 px-1">
      <button
        type="button"
        onClick={() => onFeedback("up")}
        aria-label={t("feedback.helpful")}
        aria-pressed={feedback === "up"}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors",
          feedback === "up"
            ? "bg-success/20 text-success"
            : "text-ink-subtle hover:bg-surface-2 hover:text-ink",
        )}
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onFeedback("down")}
        aria-label={t("feedback.notHelpful")}
        aria-pressed={feedback === "down"}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors",
          feedback === "down"
            ? "bg-danger/20 text-danger"
            : "text-ink-subtle hover:bg-surface-2 hover:text-ink",
        )}
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
    </div>
  )
}

function ToolTraceList({ trace }: { trace: ToolTrace[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5 text-2xs">
      {trace.map((t) => {
        const hasResult = t.result !== undefined
        return (
          <li
            key={t.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono",
              hasResult
                ? "border-line bg-surface-2 text-ink-muted"
                : "border-accent/30 bg-accent/5 text-accent",
            )}
          >
            <ToolIcon name={t.name} className="h-3 w-3" />
            {t.name}
            {hasResult ? (
              <span className="opacity-60">·</span>
            ) : (
              <span className="animate-pulse">…</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ActionCard({
  action,
  resolved,
  onConfirm,
  onDismiss,
}: {
  action: ProposedAction
  resolved?: ActionResolution
  onConfirm: () => void
  onDismiss: () => void
}) {
  const t = useTranslations("averia")
  if (action.kind === "add_to_cart") {
    if (resolved === "dismissed") return null
    const totalCents = action.unitPriceCents * action.qty
    const isAdded = resolved === "added"
    return (
      <div
        className={cn(
          "rounded-[var(--radius)] border p-3 text-sm",
          isAdded ? "border-success/30 bg-success/5" : "border-accent/30 bg-accent-soft",
        )}
      >
        <div className="flex items-start gap-2">
          {isAdded ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {t("actions.addPrompt", {
                qty: action.qty,
                name: action.productName,
                mg: action.mg,
              })}
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {(totalCents / 100).toFixed(2)} € · SKU {action.sku}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isAdded}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
              isAdded
                ? "cursor-default bg-success/15 text-success"
                : "bg-accent text-white hover:bg-accent-hover",
            )}
          >
            <Check className="h-3 w-3" /> {isAdded ? t("actions.added") : t("actions.addToCart")}
          </button>
          {isAdded ? null : (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted hover:bg-surface-2"
            >
              <X className="h-3 w-3" /> {t("actions.dismiss")}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (action.kind === "remember") {
    if (resolved === "dismissed") return null
    const isSaved = resolved === "added"
    return (
      <div
        className={cn(
          "rounded-[var(--radius)] border p-3 text-sm",
          isSaved ? "border-success/30 bg-success/5" : "border-ice/40 bg-ice-soft/40",
        )}
      >
        <div className="flex items-start gap-2">
          {isSaved ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          )}
          <div className="flex-1">
            <p className="font-medium">{t("actions.rememberPrompt")}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {action.value} · {action.key}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaved}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
              isSaved
                ? "cursor-default bg-success/15 text-success"
                : "bg-accent text-on-accent hover:bg-accent-hover",
            )}
          >
            <Check className="h-3 w-3" />
            {isSaved ? t("actions.remembered") : t("actions.remember")}
          </button>
          {isSaved ? null : (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted hover:bg-surface-2"
            >
              <X className="h-3 w-3" /> {t("actions.dismiss")}
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}

function CitationChips({ citations }: { citations: CitationRef[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {citations.map((c) => (
        <a
          key={`${c.source}-${c.sourceId}-${c.index}`}
          href={c.url ?? "#"}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-2xs font-medium text-ink-muted",
            "transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent",
          )}
          target={c.url ? "_blank" : undefined}
          rel={c.url ? "noreferrer noopener" : undefined}
        >
          <span className="font-mono text-3xs text-accent">[{c.index}]</span>
          <span className="max-w-[180px] truncate">{c.title}</span>
          {c.url ? <ExternalLink className="h-3 w-3 opacity-60" aria-hidden /> : null}
        </a>
      ))}
    </div>
  )
}

export interface MessageListProps {
  messages: ChatMessage[]
  isStreaming: boolean
  emptyState: React.ReactNode
  onConfirmAction?: (action: ProposedAction, messageId: string) => void
  onDismissAction?: (action: ProposedAction, messageId: string) => void
  onFeedback?: (messageId: string, feedback: "up" | "down") => void
}

export function MessageList({
  messages,
  isStreaming,
  emptyState,
  onConfirmAction,
  onDismissAction,
  onFeedback,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageCount = messages.length
  const lastMessageContent = messages.at(-1)?.content ?? ""

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on streaming tokens requires `isStreaming`
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: messageCount <= 1 ? "auto" : "smooth" })
  }, [messageCount, lastMessageContent, isStreaming])

  if (messages.length === 0) {
    return (
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        {emptyState}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-busy={isStreaming}
      className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
    >
      {messages.map((m) => (
        <Message
          key={m.id}
          message={m}
          isStreaming={isStreaming && m === messages.at(-1) && m.role === "assistant"}
          onConfirmAction={onConfirmAction}
          onDismissAction={onDismissAction}
          onFeedback={onFeedback}
        />
      ))}
    </div>
  )
}
