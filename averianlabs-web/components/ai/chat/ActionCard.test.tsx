/**
 * `ActionCard` — proposed-action confirmation card (Averia chat).
 *
 * The card has three render states:
 *   - Pending (default)        : show Confirm + Dismiss buttons
 *   - Added                    : confirmation pill, no buttons
 *   - Dismissed                : card unmounts entirely
 *
 * Two action shapes are supported: add_to_cart and remember. Removing
 * the cart line is not surfaced as a card in the current product.
 *
 * We render via `react-dom/server` so we don't need JSDOM / testing-library.
 */

import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ActionCard } from "@/components/ai/chat/ActionCard"
import type { ProposedAction } from "@/lib/ai/types/events"

const messages = {
  averia: {
    actions: {
      addPrompt: "Add {qty} × {name} {mg}mg to the cart?",
      addToCart: "Add to cart",
      added: "Added",
      dismiss: "Dismiss",
      rememberPrompt: "Remember this?",
      remember: "Save",
      remembered: "Saved",
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

const addAction: ProposedAction = {
  kind: "add_to_cart",
  sku: "BPC-157",
  productSlug: "bpc-157",
  productName: "BPC-157",
  mg: 5,
  qty: 2,
  unitPriceCents: 3990,
}

const rememberAction: ProposedAction = {
  kind: "remember",
  key: "preferred_vial",
  value: "5mg",
}

describe("ActionCard — add_to_cart", () => {
  it("renders the add prompt + Confirm + Dismiss buttons in the pending state", () => {
    const html = withIntl(
      <ActionCard action={addAction} onConfirm={() => {}} onDismiss={() => {}} />,
    )
    expect(html).toContain("Add")
    expect(html).toContain("BPC-157")
    expect(html).toContain("Dismiss")
    expect(html).not.toContain("Saved")
    expect(html).not.toContain("Added")
  })

  it("renders a confirmed message and hides buttons when resolved=added", () => {
    const html = withIntl(
      <ActionCard action={addAction} resolved="added" onConfirm={() => {}} onDismiss={() => {}} />,
    )
    expect(html).toContain("Added")
    expect(html).not.toContain("Dismiss")
    expect(html).not.toContain("Add to cart")
  })

  it("renders nothing when resolved=dismissed", () => {
    const html = withIntl(
      <ActionCard
        action={addAction}
        resolved="dismissed"
        onConfirm={() => {}}
        onDismiss={() => {}}
      />,
    )
    expect(html).toBe("")
  })
})

describe("ActionCard — remember", () => {
  it("renders the remember prompt in the pending state", () => {
    const html = withIntl(
      <ActionCard action={rememberAction} onConfirm={() => {}} onDismiss={() => {}} />,
    )
    expect(html).toContain("Save")
    expect(html).toContain("5mg")
    expect(html).toContain("preferred_vial")
  })

  it("renders 'Saved' when resolved=added", () => {
    const html = withIntl(
      <ActionCard
        action={rememberAction}
        resolved="added"
        onConfirm={() => {}}
        onDismiss={() => {}}
      />,
    )
    expect(html).toContain("Saved")
    // The pending-state Save button is no longer rendered.
    expect(html).not.toMatch(/>Save</)
  })
})
