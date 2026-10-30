import { expect, test } from "@/tests/fixtures"
import { isolatedBrowserDatabase } from "@/tests/helpers/test-database"

test.skip(!process.env.CRYPTO_E2E_MOCK_ORIGIN, "Dedicated provider mocks required")
test("guest checkout, private Telegram invoice, finalized USDC, notifications and cart clearance", async ({
  cleanPage: page,
  context,
}) => {
  test.setTimeout(180_000)
  const mock = process.env.CRYPTO_E2E_MOCK_ORIGIN!
  const sql = isolatedBrowserDatabase()
  const webhook = (update: object) =>
    page.request.post("/api/telegram/webhook", {
      headers: { "x-telegram-bot-api-secret-token": process.env.TELEGRAM_WEBHOOK_SECRET! },
      data: update,
    })
  const control = (mode: string, amount = "0") =>
    page.request.post(`${mock}/control`, { data: { mode, amount } })
  const updateBase = Math.floor(Date.now() / 10)
  let orderId = ""
  let invoice: any
  await page.route("**/api/checkout/crypto-session", async (route) => {
    const response = await route.fetch()
    invoice = await response.json()
    await route.fulfill({ response })
  })
  await sql`update vials set stock_qty=stock_qty+(select coalesce(sum(r.qty),0) from inventory_reservations r join orders o on o.id=r.order_id where o.email='browser-qa-usdc-complete@example.invalid' and r.vial_id=vials.id and r.released_at is null) where sku='CHECKOUT-TEST-150'`
  await sql`delete from orders where email='browser-qa-usdc-complete@example.invalid'`
  try {
    await page.request.post(`${mock}/control`, {
      data: { mode: "none", messages: [], emails: [], rpcCalls: [] },
    })
    await sql`delete from crypto_deposits where wallet_address=${"MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6"}`
    await context.route("https://t.me/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<p>Isolated Telegram handoff</p>",
      }),
    )
    await page.goto("/en/shop/checkout-test-150")
    await expect(
      page.getByRole("heading", { name: "Checkout test — €1.50", exact: true }),
    ).toBeVisible()
    await expect(page.getByRole("note")).toContainText("No physical goods or shipment")
    await page
      .getByRole("button", { name: /add to cart/i })
      .first()
      .click()
    await page.keyboard.press("Escape")
    await page.goto("/en/checkout/cart")
    await page.getByTestId("checkout-cta").click()
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("browser-qa-usdc-complete@example.invalid")
    await page.getByRole("button", { name: /continue as guest/i }).click()
    await page.getByRole("textbox", { name: /first name/i }).fill("Checkout")
    await page.getByRole("textbox", { name: /last name/i }).fill("Test")
    await page.getByRole("textbox", { name: /street/i }).fill("Test street 1")
    await page.getByRole("textbox", { name: /postal/i }).fill("00100")
    await page.getByRole("textbox", { name: /city/i }).fill("Helsinki")
    await page.getByRole("button", { name: /continue to shipping/i }).click()
    await expect(page.getByText("Checkout test · No physical shipment")).toBeVisible()
    await page.getByRole("button", { name: /continue to payment/i }).click()
    await page.getByText("Cryptocurrency", { exact: true }).click()
    const next = page.getByRole("button", { name: /continue to telegram/i })
    await expect(next).toBeDisabled()
    await page.locator('input[type="checkbox"]').first().check()
    const [response, popup] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/api/checkout/crypto-session")),
      page.waitForEvent("popup"),
      next.click(),
    ])
    expect(response.status()).toBe(200)
    expect(invoice).toBeTruthy()
    orderId = invoice.orderId
    expect(invoice.chain).toBe("usdc_solana")
    await expect(page).toHaveURL(/\/checkout\/confirm\//)
    await popup.waitForURL(invoice.telegramUrl)
    await expect(page.getByRole("link", { name: "Open invoice in Telegram" })).toHaveAttribute(
      "href",
      invoice.telegramUrl,
    )
    const [stored] = await sql`select * from orders where id=${orderId}`
    expect(stored.total_cents).toBe(150)
    expect(stored.shipping_cents).toBe(0)
    expect(stored.status).toBe("awaiting_crypto")
    const token = new URL(invoice.telegramUrl).searchParams.get("start")!
    const customer = 707001
    const start = {
      update_id: updateBase,
      message: {
        message_id: 1,
        chat: { id: customer, type: "private" },
        from: { id: customer, language_code: "en" },
        text: `/start ${token}`,
      },
    }
    expect((await webhook(start)).status()).toBe(200)
    const messages = await page.request.get(`${mock}/state`).then((r) => r.json())
    const sent = messages.messages.find((m: { text?: string }) => m.text?.includes(stored.number))
    expect(sent.chat_id).toBe(customer)
    expect(sent.text).toContain(invoice.amountCrypto)
    expect(sent.text).toContain("MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6")
    const count = messages.messages.length
    expect((await webhook(start)).status()).toBe(200)
    expect((await page.request.get(`${mock}/state`).then((r) => r.json())).messages.length).toBe(
      count,
    )
    const wrong = await page.request.post("/api/telegram/webhook", {
      headers: { "x-telegram-bot-api-secret-token": "wrong" },
      data: start,
    })
    expect(wrong.status()).toBe(401)
    const amount = BigInt(Math.round(Number(invoice.amountCrypto) * 1e6)).toString()
    // Each rejected transfer is checked in a separate scan, and cannot pay this order.
    for (const [i, mode] of [
      "none",
      "historical",
      "wrong_mint",
      "unconfirmed",
      "short",
    ].entries()) {
      await control(mode, amount)
      await webhook({
        update_id: updateBase + 100 + i,
        callback_query: {
          id: `button-${i}`,
          data: `paid:${token}`,
          from: { id: customer, language_code: "en" },
          message: { message_id: 1, chat: { id: customer, type: "private" } },
        },
      })
      expect((await sql`select status from orders where id=${orderId}`)[0].status).toBe(
        "awaiting_crypto",
      )
      // Simulate distinct transactions; rejected mock scans must not contaminate the next case.
      await sql`delete from crypto_deposits where wallet_address=${"MHjjXuFzmbwFmMWkUFoALmVr2wEPC27CVdKw618GEo6"}`
    }
    await control("paid", amount)
    const cron = await page.request.get("/api/cron/crypto", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    expect(cron.status()).toBe(200)
    const report = await cron.json()
    expect(report.chains[0].matched).toBe(1)
    expect(report.telegram.failed).toBe(0)
    await expect
      .poll(async () => (await sql`select status from orders where id=${orderId}`)[0].status)
      .toBe("paid")
    await expect(page.getByRole("heading", { name: "Payment confirmed", exact: true })).toBeVisible(
      {
        timeout: 15000,
      },
    )
    const maintenance = await page.request.get("/api/cron/maintenance", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    expect(maintenance.status()).toBe(200)
    const delivered = await page.request.get(`${mock}/state`).then((r) => r.json())
    expect(
      delivered.messages.some((m: { text?: string }) =>
        m.text?.includes("Checkout test paid — no goods or shipment"),
      ),
    ).toBe(true)
    expect(
      delivered.emails.some((e: { to?: string[] }) =>
        JSON.stringify(e.to).includes("browser-qa-usdc-complete@example.invalid"),
      ),
    ).toBe(true)
    expect(
      (
        await sql`select count(*)::integer as n from email_outbox where dedupe_key=${`order-paid:${orderId}`}`
      )[0].n,
    ).toBe(1)
    await page.request.get("/api/cron/crypto", {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    expect(
      (
        await sql`select count(*)::integer as n from crypto_deposits where matched_session_id=${token}`
      )[0].n,
    ).toBe(1)
    await page.goto("/en/checkout/cart")
    await expect(page.getByTestId("checkout-cta")).toHaveCount(0)
  } finally {
    await sql.end()
  }
})
