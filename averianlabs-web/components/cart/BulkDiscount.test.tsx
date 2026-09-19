/**
 * BulkDiscount component tests.
 *
 * Render via `react-dom/server` (already in `react-dom`) so we don't need
 * a JSDOM environment or testing-library. We assert on the rendered HTML
 * string for shape and on the absence / presence of text.
 *
 * These cover the cart-line pill, the next-tier nudge, the tier list
 * shown on the homepage trust block, and the summary banner.
 */

import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  BulkDiscountBadge,
  BulkDiscountNudge,
  BulkDiscountSummary,
  BulkDiscountTierList,
} from "@/components/cart/BulkDiscount"
import type { BulkDiscountLine } from "@/lib/pricing/bulk-discount"

const messages = {
  checkout: {
    bulkDiscountLabel: "Bulk discount",
    bulkTier10: "−10% off · 5–10 vials of the same SKU",
    bulkTier15: "−15% off · 11–20 vials of the same SKU",
    bulkTier20: "−20% off · 21+ vials of the same SKU",
    bulkNudge10: "Add {units} more vial of this SKU to unlock −10% off",
    bulkNudge10_plural: "Add {units} more vials of this SKU to unlock −10% off",
    bulkNudge15: "Add {units} more vial of this SKU to unlock −15% off",
    bulkNudge15_plural: "Add {units} more vials of this SKU to unlock −15% off",
    bulkNudge20: "Add {units} more vial of this SKU to unlock −20% off",
    bulkNudge20_plural: "Add {units} more vials of this SKU to unlock −20% off",
  },
}

function withIntl(node: React.ReactNode): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  )
}

describe("BulkDiscountBadge", () => {
  function line(percent: number): BulkDiscountLine {
    return {
      sku: "BPC-157",
      qty: 5,
      unitPriceCents: 3990,
      percent,
      discountCents: 0,
      discountedSubtotalCents: 0,
    }
  }

  it("renders nothing when the line has no bulk discount", () => {
    expect(withIntl(<BulkDiscountBadge line={line(0)} />)).toBe("")
  })

  it("renders a −10% pill for the 5–10 tier", () => {
    const html = withIntl(<BulkDiscountBadge line={line(0.1)} />)
    expect(html).toContain("−10%")
    expect(html).toContain("bulk")
  })

  it("renders a −15% pill for the 11–20 tier", () => {
    const html = withIntl(<BulkDiscountBadge line={line(0.15)} />)
    expect(html).toContain("−15%")
  })

  it("renders a −20% pill for the 21+ tier", () => {
    const html = withIntl(<BulkDiscountBadge line={line(0.2)} />)
    expect(html).toContain("−20%")
  })
})

describe("BulkDiscountNudge", () => {
  it("shows nothing at the top tier (21+) — nudge becomes noise", () => {
    expect(withIntl(<BulkDiscountNudge qty={50} />)).toBe("")
  })

  it("shows a one-vial nudge just below the top tier (20 → 21 needed)", () => {
    // qty=20 is one vial short of the 21+ tier. The nudge should suggest
    // adding exactly 1 vial to unlock −20%.
    const html = withIntl(<BulkDiscountNudge qty={20} />)
    expect(html).toContain("1")
    expect(html).toContain("vial of this SKU") // singular
    expect(html).toContain("−20%")
  })

  it("prompts to add 2 vials when 3 are in cart", () => {
    const html = withIntl(<BulkDiscountNudge qty={3} />)
    expect(html).toContain("2")
    expect(html).toContain("−10%")
  })

  it("uses singular 'vial' wording when unitsAway is 1", () => {
    const html = withIntl(<BulkDiscountNudge qty={10} />)
    expect(html).toContain("−15%")
    expect(html).toContain("vial of this SKU") // singular form
  })

  it("uses plural 'vials' wording when unitsAway is 2+", () => {
    const html = withIntl(<BulkDiscountNudge qty={3} />)
    expect(html).toContain("vials of this SKU") // plural form
  })
})

describe("BulkDiscountTierList", () => {
  it("renders all three tiers in highest-first order", () => {
    const html = withIntl(<BulkDiscountTierList />)
    const idx20 = html.indexOf("−20%")
    const idx15 = html.indexOf("−15%")
    const idx10 = html.indexOf("−10%")
    expect(idx20).toBeGreaterThan(-1)
    expect(idx15).toBeGreaterThan(idx20)
    expect(idx10).toBeGreaterThan(idx15)
  })

  it("renders the canonical tier copy", () => {
    const html = withIntl(<BulkDiscountTierList />)
    expect(html).toContain("5–10 vials")
    expect(html).toContain("11–20 vials")
    expect(html).toContain("21+ vials")
  })
})

describe("BulkDiscountSummary", () => {
  it("renders nothing when no line has a bulk tier", () => {
    const html = withIntl(
      <BulkDiscountSummary
        items={[
          { sku: "BPC-157", qty: 2, unitPriceCents: 3990 },
          { sku: "GHK-Cu", qty: 1, unitPriceCents: 2990 },
        ]}
      />,
    )
    expect(html).toBe("")
  })

  it("renders a savings banner when at least one line qualifies", () => {
    const html = withIntl(
      <BulkDiscountSummary items={[{ sku: "BPC-157", qty: 8, unitPriceCents: 100_00 }]} />,
    )
    expect(html).toContain("Bulk discount")
    expect(html).toContain("−10%") // 10000 * 10% = 10% of total
    expect(html).toContain("BPC-157")
    expect(html).toContain("×8")
  })

  it("shows the right tier when the cart contains a 21+ line", () => {
    const html = withIntl(
      <BulkDiscountSummary items={[{ sku: "BPC-157", qty: 25, unitPriceCents: 100_00 }]} />,
    )
    expect(html).toContain("−20%")
  })
})
