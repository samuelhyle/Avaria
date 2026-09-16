"use client"

import { splitMarkdownForStreaming } from "@/lib/ai/streaming/markdown-split"
import { cn } from "@/lib/utils/cn"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export const ASSISTANT_PROSE = cn(
  "prose prose-sm prose-neutral max-w-none break-words dark:prose-invert",
  "prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
  "prose-headings:my-2 prose-headings:text-sm prose-headings:font-semibold",
  "prose-strong:text-ink",
  "prose-code:break-all prose-code:rounded prose-code:bg-surface-2 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
  "prose-pre:my-2 prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:bg-surface-2 prose-pre:text-xs",
  "prose-table:my-2 prose-table:block prose-table:max-w-full prose-table:overflow-x-auto prose-th:text-left prose-th:font-medium prose-td:align-top",
)

/**
 * Renders the assistant bubble. While streaming we split the in-flight text
 * into a `committed` prefix (rendered once via `react-markdown`) and a
 * `trailing` tail (rendered as plain pre-wrapped text). That prevents the
 * table / code-fence "snap" that happens when every token re-parses the
 * whole content. When the stream is done we render the full content through
 * `react-markdown` as usual.
 */
export function AssistantMarkdown({
  content,
  isStreaming,
}: { content: string; isStreaming: boolean }) {
  if (!isStreaming) {
    return (
      <div className={ASSISTANT_PROSE}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    )
  }

  const { committed, trailing } = splitMarkdownForStreaming(content)
  return (
    <div className={ASSISTANT_PROSE}>
      {committed ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{committed}</ReactMarkdown> : null}
      {trailing ? <p className="m-0 whitespace-pre-wrap">{trailing}</p> : null}
      <span
        className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-accent"
        aria-hidden
      />
    </div>
  )
}
