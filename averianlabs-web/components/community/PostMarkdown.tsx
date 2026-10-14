"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
export function PostMarkdown({ body }: { body: string }) {
  return (
    <div className="space-y-3 break-words text-sm leading-relaxed text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => <h3 className="mt-6 text-lg font-semibold">{children}</h3>,
          h2: ({ children }) => <h3 className="mt-5 text-base font-semibold">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-4 text-sm font-semibold">{children}</h4>,
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent pl-3 text-ink-muted">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-line bg-surface-2 p-3 text-xs">
              {children}
            </pre>
          ),
          a: ({ href, children }) =>
            href && /^(https?:\/\/|\/(?!\/)|#)/i.test(href) ? (
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="break-words text-accent underline"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          table: ({ children }) => (
            <div className="max-w-full overflow-x-auto">
              <table className="text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-line p-2">{children}</th>,
          td: ({ children }) => <td className="border-b border-line p-2">{children}</td>,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
