import { expect, test } from "@/tests/fixtures"

/**
 * The crypto payment option.
 *
 * The option is only offered when the Telegram bot is configured, because the
 * customer is handed over to the bot. Offering it without a bot would lead
 * to a dead end at the payment step, so this test guards the wiring between
 * `/api/crypto/chains` and the payment method list.
 *
 * The chains are not hardcoded: they come from the server, and the browser
 * must show exactly what the server accepts.
 */
test.describe("the crypto payment option", () => {
  test("is offered and lists the chains the store accepts", async ({ cleanPage }) => {
    const errors: string[] = []
    cleanPage.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })

    // What the server says it accepts.
    const expected = await cleanPage.request
      .get("/api/crypto/chains")
      .then(
        (response) => response.json() as { chains?: Array<{ label: string }>; available?: boolean },
      )
    test.skip(!expected.available, "no Telegram bot is configured")
    test.skip(!expected.chains?.length, "no crypto chain is enabled")

    await cleanPage.goto("/en/shop/qa-peptide")
    const add = cleanPage.getByRole("button", { name: /add to cart/i }).first()
    await add.scrollIntoViewIfNeeded()
    await add.click()
    await cleanPage.keyboard.press("Escape")

    await cleanPage.goto("/en/checkout/cart")
    await cleanPage.getByTestId("checkout-cta").click()
    await cleanPage.waitForURL("**/en/checkout/email")
    await cleanPage
      .locator("main")
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("crypto-qa@example.invalid")
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
    await cleanPage
      .locator("main")
      .getByRole("button", { name: /continue to shipping/i })
      .click()
    await cleanPage.waitForURL("**/en/checkout/shipping")
    await cleanPage
      .locator("main")
      .getByRole("button", { name: /continue to payment/i })
      .click()
    await cleanPage.waitForURL("**/en/checkout/payment")

    // The option is in the payment method list.
    const crypto = cleanPage.getByText("Cryptocurrency", { exact: true })
    await expect(crypto).toBeVisible()
    await crypto.click()

    // The chains come from the server, so the browser never decides what is
    // accepted.
    for (const chain of expected.chains ?? [])
      await expect(cleanPage.getByText(chain.label)).toBeVisible()

    expect(errors).toEqual([])
  })
})
