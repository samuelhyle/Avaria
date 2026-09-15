import { expect, test } from "@/tests/fixtures"

test.describe("public routes return 200", () => {
  const routes = [
    "/en",
    "/en/shop",
    "/en/shop/bpc-157",
    "/en/about",
    "/en/coa",
    "/en/compare",
    "/en/contact",
    "/en/faq",
    "/en/lab-tests",
    "/en/legal/terms",
    "/en/legal/privacy",
    "/en/legal/cookies",
    "/en/legal/research-disclaimer",
    "/en/peptide-calculator",
    "/en/quality",
    "/en/partner",
    "/en/rewards",
    "/en/wishlist",
    "/en/support/shipping-returns",
  ]

  for (const route of routes) {
    test(route, async ({ request }) => {
      const res = await request.get(route)
      expect(res.status()).toBe(200)
    })
  }
})
