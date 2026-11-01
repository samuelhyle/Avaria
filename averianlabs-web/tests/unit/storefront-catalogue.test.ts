import { CHECKOUT_FIXTURE_SLUGS, CHECKOUT_TEST_SLUG } from "@/lib/checkout/test-product"
import { storefrontProducts } from "@/lib/products/catalogue"
import type { Product } from "@/lib/products/types"
import { describe, expect, it } from "vitest"

/**
 * The payment fixtures must never reach the storefront.
 *
 * Each one exists to exercise a payment path: no goods, no batch, no
 * certificate, a placeholder price. Left in the catalogue they became the
 * hero of the home page, the whole of the featured row, the shop's only
 * available products, the first thing the empty cart suggested and an
 * entry in the sitemap. A store whose flagship product is called
 * "Checkout test — €1.50" does not look like the store it is meant to be.
 *
 * This is a guard rather than a fix: the exclusion is one line in
 * `storefrontProducts`, and a line like that is easy to lose in a
 * refactor.
 */
function product(overrides: Partial<Product> & { slug: string }): Product {
  return {
    category: "supplies",
    dataSource: "database",
    productType: "supplies",
    specificationsVerified: false,
    createdAt: new Date(0).toISOString(),
    defaultTranslation: { name: overrides.slug, tagline: "", description: "" },
    translations: {},
    vials: [],
    ...overrides,
  } as Product
}

describe("the storefront catalogue", () => {
  it("leaves out the payment fixtures", () => {
    const shown = storefrontProducts([
      product({ slug: "bpc-157" }),
      product({ slug: CHECKOUT_TEST_SLUG, checkoutTest: true }),
      product({ slug: "test-usdc-1-50", checkoutTest: true }),
    ])
    expect(shown.map((p) => p.slug)).toEqual(["bpc-157"])
  })

  it("knows both fixture names", () => {
    // The crypto fixture has no marker of its own in the seeded data, so the
    // name is the only way to recognise it.
    expect(CHECKOUT_FIXTURE_SLUGS.has(CHECKOUT_TEST_SLUG)).toBe(true)
    expect(CHECKOUT_FIXTURE_SLUGS.has("test-usdc-1-50")).toBe(true)
  })

  it("can put them back while the payment path is being tested", () => {
    const previous = process.env.CHECKOUT_FIXTURE_IN_STOREFRONT
    process.env.CHECKOUT_FIXTURE_IN_STOREFRONT = "true"
    try {
      const shown = storefrontProducts([product({ slug: CHECKOUT_TEST_SLUG })])
      expect(shown).toHaveLength(1)
    } finally {
      if (previous === undefined) process.env.CHECKOUT_FIXTURE_IN_STOREFRONT = ""
      else process.env.CHECKOUT_FIXTURE_IN_STOREFRONT = previous
    }
  })
})
