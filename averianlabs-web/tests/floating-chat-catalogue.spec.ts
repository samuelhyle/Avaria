import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"
import { isolatedBrowserDatabase } from "@/tests/helpers/test-database"

// The real client catalogue and cart are used. Only the provider/tool wire
// response is replayed, from explicitly owned local QA catalogue records.
test.beforeEach(async ({ baseURL }) => {
  if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
    throw new Error("Floating-cart fixtures require an explicit local browser target")
  const sql = isolatedBrowserDatabase()
  try {
    const [product] = await sql`select spec_json from products where slug='qa-peptide'`
    if (product?.spec_json?.evidenceRef !== "isolated-browser-fixture")
      throw new Error("Seed the owned local QA peptide before this regression")
  } finally {
    await sql.end()
  }
})

for (const locale of ["en", "fi"] as const) {
  const m = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"))
  test(`${locale}: floating Averia confirms the exact catalogue SKU before adding its quantity and units`, async ({
    cleanPage: page,
    baseURL,
  }) => {
    const sql = isolatedBrowserDatabase()
    let productContextName = ""
    let fixture: {
      sku: string
      productSlug: string
      name: string
      mg: number
      sizeValue: number
      sizeUnit: "mg"
      qty: number
      unitPriceCents: number
      purchaseMode: "direct"
    }
    try {
      const [row] = await sql`
        select v.sku,v.size_mg,v.size_value,v.size_unit,v.price_cents,v.stock_qty,
          v.purchase_mode,t.name,e.name as context_name
        from vials v join products p on p.id=v.product_id
          join product_translations t on t.product_id=p.id and t.locale=${locale}
          join product_translations e on e.product_id=p.id and e.locale='en'
        where p.slug='qa-peptide' and p.spec_json->>'evidenceRef'='isolated-browser-fixture'
          and v.sku='QA-PEPTIDE-10'
      `
      if (!row || row.purchase_mode !== "direct" || row.stock_qty < 3 || row.price_cents <= 0)
        throw new Error("The owned direct-purchase QA-PEPTIDE-10 fixture is unavailable")
      expect(row.size_unit).toBe("mg")
      expect(Number(row.size_value)).toBe(10)
      productContextName = row.context_name
      fixture = {
        sku: row.sku,
        productSlug: "qa-peptide",
        name: row.name,
        mg: Number(row.size_mg ?? row.size_value),
        sizeValue: Number(row.size_value),
        sizeUnit: "mg",
        qty: 3,
        unitPriceCents: Number(row.price_cents),
        purchaseMode: "direct",
      }
    } finally {
      await sql.end()
    }

    const blockedWrites: string[] = []
    const errors: string[] = []
    let sentContext: unknown
    let requests = 0
    page.on("pageerror", (error) => errors.push(error.message))
    await page.context().addCookies([{ name: "averia_consent", value: "declined", url: baseURL }])
    await page.route("**/api/**", (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      if (
        ["GET", "HEAD", "OPTIONS"].includes(request.method()) ||
        (path === "/api/ai/identity" && request.method() === "POST")
      )
        return route.continue()
      blockedWrites.push(`${request.method()} ${path}`)
      return route.abort("blockedbyclient")
    })
    await page.route("**/api/ai/chat", (route) => {
      requests++
      const payload = route.request().postDataJSON()
      expect(payload.locale).toBe(locale)
      sentContext = payload.context
      const events = [
        {
          type: "tool-call",
          id: "display-fixture-cart",
          name: "addToCart",
          args: { slug: fixture.productSlug, sku: fixture.sku, qty: fixture.qty },
        },
        {
          type: "tool-result",
          id: "display-fixture-cart",
          name: "addToCart",
          content: { ok: true, message: "Local QA confirmation fixture; no order is created." },
        },
        {
          type: "action",
          action: {
            kind: "add_to_cart",
            sku: fixture.sku,
            productSlug: fixture.productSlug,
            productName: fixture.name,
            mg: fixture.mg,
            sizeValue: fixture.sizeValue,
            sizeUnit: fixture.sizeUnit,
            qty: fixture.qty,
            unitPriceCents: fixture.unitPriceCents,
          },
        },
        {
          type: "text",
          delta:
            locale === "fi"
              ? "Vain paikallinen testiehdotus. Tarkista tuotekoodi ennen vahvistamista."
              : "Local test proposal only. Review the product code before confirming.",
        },
        { type: "done", usage: { tokensIn: 0, tokensOut: 0, latencyMs: 0 } },
      ]
      return route.fulfill({
        contentType: "text/event-stream",
        body: `: local-display-fixture\n\n${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}`,
      })
    })
    const cartItems = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("averianlabs-cart") ?? "null")?.state?.items ?? [],
      )

    // The visible product selects 5 mg; the actual proposed action selects 10 mg.
    // This must use the action's exact catalogue SKU rather than the default vial.
    await page.goto(`/${locale}/shop/qa-peptide?sku=QA-PEPTIDE-5`)
    await expect(page.locator('main fieldset button[aria-pressed="true"]')).toContainText(
      "QA-PEPTIDE-5",
    )
    const open = page.getByRole("button", { name: m.averia.open, exact: true })
    await expect(open).toBeVisible({ timeout: 30_000 })
    await open.click()
    const chat = page.getByRole("dialog", { name: m.averia.title, exact: true })
    await chat
      .getByRole("textbox", { name: m.averia.inputLabel, exact: true })
      .fill(`LOCAL DISPLAY FIXTURE: propose 3 × ${fixture.sku}, require confirmation.`)
    await chat.getByRole("button", { name: m.averia.send, exact: true }).click()
    const confirm = chat.getByRole("button", { name: m.averia.actions.addToCart, exact: true })
    await expect(confirm).toBeVisible()
    await expect(chat).toContainText(`SKU ${fixture.sku}`)
    await expect(chat).toContainText("10 mg")
    await expect(chat).toContainText("3 ×")
    expect(await cartItems()).toEqual([])

    await confirm.click()
    await expect.poll(cartItems).toEqual([expect.objectContaining(fixture)])
    await expect(
      chat.getByRole("button", { name: m.averia.actions.added, exact: true }),
    ).toBeDisabled()
    await chat.getByRole("button", { name: m.averia.close, exact: true }).click()
    await expect(chat).toHaveCount(0)
    const drawer = page.getByRole("dialog", { name: m.cart.drawerTitle, exact: true })
    await expect(drawer).toBeVisible()
    const item = drawer.locator("li").filter({ hasText: fixture.sku })
    await expect(item).toHaveCount(1)
    await expect(item).toContainText(fixture.name)
    await expect(item).toContainText("10 mg")
    await expect(item.locator("span.w-7")).toHaveText("3")
    await drawer.getByRole("button", { name: m.common.close, exact: true }).click()

    await page.reload()
    await expect.poll(cartItems).toEqual([expect.objectContaining(fixture)])
    await page.getByRole("button", { name: m.nav.cart, exact: true }).click()
    await expect(drawer.locator("li").filter({ hasText: fixture.sku })).toContainText("10 mg")
    await expect(drawer.locator("li").filter({ hasText: "QA-PEPTIDE-5" })).toHaveCount(0)
    expect(requests).toBe(1)
    expect(sentContext).toEqual({
      kind: "product",
      slug: fixture.productSlug,
      name: productContextName,
    })
    expect(blockedWrites).toEqual([])
    expect(errors).toEqual([])
  })
}
