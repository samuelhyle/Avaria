"use client"

import { cn } from "@/lib/utils/cn"
import { useTranslations } from "next-intl"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/** Explicit styles keep research text readable without an optional typography plugin. */
export function ResearchMarkdown({ body, className }: { body: string; className?: string }) {
  const t = useTranslations("research.markdown")
  return (
    <div
      className={cn(
        "min-w-0 space-y-3 break-words text-base leading-relaxed text-ink [overflow-wrap:anywhere]",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => (
            <h3 className="mb-2 mt-5 text-lg font-semibold tracking-tight">{children}</h3>
          ),
          h2: ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold">{children}</h3>,
          h3: ({ children }) => <h4 className="mb-2 mt-4 text-base font-semibold">{children}</h4>,
          h4: ({ children }) => <h5 className="mb-2 mt-4 text-base font-semibold">{children}</h5>,
          h5: ({ children }) => <h6 className="mb-2 mt-4 text-base font-semibold">{children}</h6>,
          h6: ({ children }) => <h6 className="mb-2 mt-4 text-base font-semibold">{children}</h6>,
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="space-y-2 border-l-2 border-accent pl-4 text-ink-muted">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-5 border-line" />,
          pre: ({ children }) => (
            <pre className="max-w-full overflow-x-auto whitespace-pre rounded-lg border border-line bg-surface-2 p-3 text-sm leading-relaxed">
              {children}
            </pre>
          ),
          code: ({ children }) => (
            <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-sm">{children}</code>
          ),
          a: ({ href, children }) =>
            href && /^(https?:\/\/|\/(?!\/)|#)/i.test(href) ? (
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
                className="break-words text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          // Linked media stays a deliberate visit rather than loading arbitrary remote images.
          img: ({ src, alt }) =>
            src && /^(https?:\/\/|\/(?!\/))/i.test(src) ? (
              <a
                href={src}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-block text-accent underline underline-offset-2"
              >
                {t("imageLink", { description: alt || t("image") })}
              </a>
            ) : null,
          table: ({ children }) => (
            <div
              className="max-w-full overflow-x-auto rounded-lg border border-line"
              role="region"
              aria-label={t("table")}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: wide research tables must be keyboard scrollable.
              tabIndex={0}
            >
              <table className="w-full border-collapse text-left text-sm leading-relaxed">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
          th: ({ children }) => (
            <th scope="col" className="border-b border-line px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-line px-3 py-2 align-top">{children}</td>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
