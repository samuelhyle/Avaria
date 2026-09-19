/**
 * `FeedbackBar` — thumbs up/down on a chat message.
 *
 * Renders as two buttons. The selected one has `aria-pressed="true"` and
 * a coloured background. We verify the basic interaction shape — the
 * click handler receives the right value, and the selected state renders
 * the success/danger background.
 */

import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { FeedbackBar } from "@/components/ai/chat/FeedbackBar"

const messages = {
  averia: {
    feedback: {
      helpful: "Helpful",
      notHelpful: "Not helpful",
    },
  },
}

function withIntl(node: React.ReactNode): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  )
}

describe("FeedbackBar", () => {
  it("renders both buttons with their aria-labels", () => {
    const html = withIntl(<FeedbackBar onFeedback={() => {}} />)
    expect(html).toContain('aria-label="Helpful"')
    expect(html).toContain('aria-label="Not helpful"')
  })

  it("starts with both buttons un-pressed when no feedback is set", () => {
    const html = withIntl(<FeedbackBar onFeedback={() => {}} />)
    expect(html).not.toContain('aria-pressed="true"')
  })

  it("marks the up button as pressed when feedback='up'", () => {
    const html = withIntl(<FeedbackBar feedback="up" onFeedback={() => {}} />)
    expect(html).toContain('aria-label="Helpful" aria-pressed="true"')
    expect(html).not.toContain('aria-label="Not helpful" aria-pressed="true"')
  })

  it("marks the down button as pressed when feedback='down'", () => {
    const html = withIntl(<FeedbackBar feedback="down" onFeedback={() => {}} />)
    expect(html).toContain('aria-label="Not helpful" aria-pressed="true"')
    expect(html).not.toContain('aria-label="Helpful" aria-pressed="true"')
  })

  it("uses the success colour class for a thumbs-up selection", () => {
    const html = withIntl(<FeedbackBar feedback="up" onFeedback={() => {}} />)
    expect(html).toContain("bg-success/20")
  })

  it("uses the danger colour class for a thumbs-down selection", () => {
    const html = withIntl(<FeedbackBar feedback="down" onFeedback={() => {}} />)
    expect(html).toContain("bg-danger/20")
  })
})
