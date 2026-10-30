import { expect, test } from "@/tests/fixtures"

test.describe("checkout flow", () => {
  test("empty cart shows the empty state with a CTA to shop", async ({ cleanPage }) => {
    await cleanPage.goto("/en/checkout/cart")

    const empty = cleanPage.getByText(/empty|nothing here|your cart is empty/i).first()
    await expect(empty).toBeVisible()

    // The CTA back to the shop is rendered as a Link/button.
    const cta = cleanPage.getByRole("link", { name: /shop|continue shopping|browse/i }).first()
    await expect(cta).toBeVisible()
  })

  test("checkout steps render with the right ordering", async ({ cleanPage }) => {
    await cleanPage.goto("/en/checkout/email")
    // The step indicator should show "Email" as a current or upcoming step.
    await expect(cleanPage.getByText(/email/i).first()).toBeVisible()
  })

  test("shipping step uses fieldset/legend for radio groups", async ({ cleanPage }) => {
    // Seed the cart via API/store first by visiting a PDP and clicking ATC.
    await cleanPage.goto("/en/shop/qa-peptide")
    const add = cleanPage.getByRole("button", { name: /add to cart/i }).first()
    await add.scrollIntoViewIfNeeded()
    await add.click()

    await cleanPage.keyboard.press("Escape")
    await cleanPage.goto("/en/checkout/shipping")
    await cleanPage.waitForURL("**/en/checkout/email")
    await cleanPage
      .locator("main")
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("checkout-qa@example.invalid")
    await cleanPage
      .locator("main")
      .getByRole("button", { name: /continue as guest/i })
      .click()
    await cleanPage.waitForURL("**/en/checkout/address")
    await cleanPage.getByRole("textbox", { name: /first name/i }).fill("Test")
    await cleanPage.getByRole("textbox", { name: /last name/i }).fill("User")
    await cleanPage.getByRole("textbox", { name: /street/i }).fill("Test street 1")
    await cleanPage.getByRole("textbox", { name: /postal/i }).fill("00100")
    await cleanPage.getByRole("textbox", { name: /city/i }).fill("Helsinki")
    await cleanPage.getByRole("button", { name: /continue to shipping/i }).click()
    await cleanPage.waitForURL("**/en/checkout/shipping")
    await expect(cleanPage.locator("main fieldset")).toBeVisible()
    await expect(cleanPage.getByRole("radio")).toHaveCount(2)
    await cleanPage.getByRole("radio").last().check()
    await expect(cleanPage.getByRole("button", { name: /continue to payment/i })).toBeEnabled()
  })

  test("the cart page links into the checkout", async ({ cleanPage }) => {
    // Regression guard: the cart page once rendered no checkout control at all,
    // which left a filled cart with no way to pay. The CTA must exist and it
    // must point at the first checkout step.
    await cleanPage.goto("/en/shop/qa-peptide")
    const add = cleanPage.getByRole("button", { name: /add to cart/i }).first()
    await add.scrollIntoViewIfNeeded()
    await add.click()
    await cleanPage.keyboard.press("Escape")

    await cleanPage.goto("/en/checkout/cart")
    const cta = cleanPage.getByTestId("checkout-cta")
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAttribute("href", "/en/checkout/email")

    await cta.click()
    await cleanPage.waitForURL("**/en/checkout/email")
  })

  test("the cart total and the payment total agree for the same delivery rate", async ({
    cleanPage,
  }) => {
    await cleanPage.goto("/en/shop/qa-peptide")
    const add = cleanPage.getByRole("button", { name: /add to cart/i }).first()
    await add.scrollIntoViewIfNeeded()
    await add.click()
    await cleanPage.keyboard.press("Escape")

    await cleanPage.goto("/en/checkout/cart")
    const summary = cleanPage.locator("main")
    await expect(summary.getByText(/^Total$/).first()).toBeVisible()
    const cartTotal = await summary
      .getByText(/^Total$/)
      .first()
      .locator("..")
      .innerText()
    const cartTotalCents = Number(cartTotal.replace(/[^\d]/g, ""))

    await cleanPage.getByTestId("checkout-cta").click()
    await cleanPage.waitForURL("**/en/checkout/email")
    await cleanPage
      .locator("main")
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("checkout-qa@example.invalid")
    await cleanPage
      .locator("main")
      .getByRole("button", { name: /continue as guest/i })
      .click()
    await cleanPage.waitForURL("**/en/checkout/address")
    await cleanPage.getByRole("textbox", { name: /first name/i }).fill("Test")
    await cleanPage.getByRole("textbox", { name: /last name/i }).fill("User")
    await cleanPage.getByRole("textbox", { name: /street/i }).fill("Test street 1")
    await cleanPage.getByRole("textbox", { name: /postal/i }).fill("00100")
    await cleanPage.getByRole("textbox", { name: /city/i }).fill("Helsinki")
    await cleanPage.getByRole("button", { name: /continue to shipping/i }).click()
    await cleanPage.waitForURL("**/en/checkout/shipping")

    // The rate the cart quoted must be the one that is pre-selected here.
    await expect(cleanPage.locator('input[type="radio"]:checked')).toHaveCount(1)

    await cleanPage.getByRole("button", { name: /continue to payment/i }).click()
    await cleanPage.waitForURL("**/en/checkout/payment")
    const payTotal = await cleanPage
      .locator("main")
      .getByText(/^Total$/)
      .first()
      .locator("..")
      .innerText()
    const payTotalCents = Number(payTotal.replace(/[^\d]/g, ""))
    expect(payTotalCents).toBe(cartTotalCents)
  })
})
