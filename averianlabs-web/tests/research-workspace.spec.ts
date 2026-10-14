import { readFileSync } from "node:fs"
import { calculateLaboratory } from "@/lib/calculations"
import { expect, test } from "@/tests/fixtures"
import { cleanBrowserRecords, isolatedBrowserDatabase } from "@/tests/helpers/test-database"
import AxeBuilder from "@axe-core/playwright"

for (const locale of ["en", "fi"]) {
  const m = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"))
  const t = m.calculator
  test(`${locale}: calculation modes preserve units, show remainders and export the record`, async ({
    cleanPage: page,
  }) => {
    await page.goto(`/${locale}/peptide-calculator`)
    const field = (name: string) => page.getByRole("textbox", { name, exact: true })
    const result = page.locator("main section[aria-live]")
    await field(t.mass).fill(locale === "fi" ? "12,5" : "12.5")
    await expect(result).toContainText(locale === "fi" ? "6,25" : "6.25")
    await page.getByRole("combobox", { name: `${t.mass} · ${t.unit}` }).selectOption("mcg")
    await expect(field(t.mass)).toHaveValue("12500")
    await expect(result).toContainText(locale === "fi" ? "6,25" : "6.25")
    await page.getByRole("checkbox", { name: t.targetVolume }).check()
    await field(t.target).fill("5")
    await expect(result).toContainText(locale === "fi" ? "2,5 mL" : "2.5 mL")
    await page.getByRole("button", { name: t.dilution, exact: true }).click()
    await field(t.stock).fill("5")
    await field(t.target).fill("1")
    await field(t.volume).fill("2")
    await expect(result).toContainText(locale === "fi" ? "0,4 mL" : "0.4 mL")
    await expect(result).toContainText(locale === "fi" ? "1,6 mL" : "1.6 mL")
    await field(t.target).fill("6")
    await expect(result.getByRole("status")).toHaveText(t.targetTooHigh)
    await page.getByRole("button", { name: t.aliquots, exact: true }).click()
    await page.getByRole("combobox", { name: `${t.mass} · ${t.unit}` }).selectOption("mg")
    await field(t.mass).fill("1")
    await field(t.volume).fill("1")
    await field(t.aliquot).fill("300")
    await expect(result.locator("dl > div").filter({ hasText: t.count })).toContainText("3")
    await expect(result.locator("dl > div").filter({ hasText: t.remainingMass })).toContainText(
      "100 µg",
    )
    const download = page.waitForEvent("download")
    await page.getByRole("button", { name: t.export, exact: true }).click()
    const file = await download
    const path = await file.path()
    if (!path) throw new Error("CSV download missing")
    const csv = readFileSync(path, "utf8")
    expect(csv).toContain('"version","laboratory-v2"')
    expect(csv).toContain('"aliquotCount","3"')
    expect(csv).toContain('"aliquotMcg","300"')
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")))
    await expect(page.locator("main details")).toHaveAttribute("open", "")
    await expect(page.locator("main details")).toContainText(t.assumptions)
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")))
    await expect(page.locator("main details")).not.toHaveAttribute("open")
  })

  test(`${locale}: selected SKU carries its mass to the calculator and assistant only after Send`, async ({
    cleanPage: page,
  }) => {
    let requests = 0
    await page.route("**/api/ai/chat", async (route) => {
      requests++
      const calculation = calculateLaboratory({
        mode: "concentration",
        massMg: 10,
        finalVolumeMl: 2,
      })
      if (!calculation) throw new Error("Invalid calculation fixture")
      const events = [
        {
          type: "tool-call",
          id: "calculation-qa",
          name: "calculateLaboratory",
          args: calculation.inputs,
        },
        {
          type: "tool-result",
          id: "calculation-qa",
          name: "calculateLaboratory",
          content: { calculation: { ...calculation, values: { concentrationMgPerMl: 999 } } },
        },
        {
          type: "text",
          delta: locale === "fi" ? "Pitoisuus on 5 mg/mL." : "The concentration is 5 mg/mL.",
        },
        { type: "done", usage: { tokensIn: 1, tokensOut: 1, latencyMs: 1 } },
      ]
      await route.fulfill({
        contentType: "text/event-stream",
        body: events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""),
      })
    })
    await page.goto(`/${locale}/shop/qa-peptide`)
    await page
      .locator("main fieldset")
      .getByRole("button")
      .filter({ hasText: "QA-PEPTIDE-10" })
      .click()
    await page
      .locator("main")
      .getByRole("link", { name: /calculator|laskur/i })
      .first()
      .click()
    await expect(page.getByRole("textbox", { name: t.mass, exact: true })).toHaveValue("10")
    await expect(page.locator("main")).toContainText("QA-PEPTIDE-10")
    await page.getByRole("link", { name: t.askAssistant }).click()
    const input = page.locator("main textarea")
    await expect(input).not.toHaveValue("")
    expect(requests).toBe(0)
    await page.locator("main").getByRole("button", { name: m.averia.send, exact: true }).click()
    await expect(page.locator("main")).toContainText("5 mg/mL")
    await expect(page.locator("main")).not.toContainText("999")
    expect(requests).toBe(1)
    await page.goto(`/${locale}/shop/qa-water`)
    await expect(
      page.locator("main").getByRole("link", { name: /calculator|laskur/i }),
    ).toHaveCount(0)
  })

  test(`${locale}: private saved work and pending submissions stay out of the public hub`, async ({
    cleanPage: page,
    request,
  }) => {
    const sql = isolatedBrowserDatabase()
    await sql.end()
    const email = `browser-qa-workspace-${locale}-${crypto.randomUUID()}@example.invalid`
    const password = "QA-only-local-password-92842"
    try {
      expect(
        (
          await request.post("/api/auth/register", {
            data: { email, password, name: "Workspace QA", locale },
          })
        ).status(),
      ).toBe(200)
      await page.goto(`/${locale}/account`)
      await page.locator('main input[name="email"]').fill(email)
      await page.locator('main input[name="password"]').fill(password)
      await page.locator('main form button[type="submit"]').click()
      await expect(page.locator('main input[name="password"]')).toHaveCount(0)
      await page.goto(`/${locale}/peptide-calculator`)
      await page.getByRole("button", { name: t.save, exact: true }).click()
      await expect(page.locator("main").getByRole("heading", { name: t.history })).toBeVisible()
      const savedReference = await page.request.post("/api/calculations", {
        data: {
          inputs: { mode: "concentration", massMg: 5, finalVolumeMl: 2 },
          sourceSku: "QA-PEPTIDE-5",
        },
      })
      expect(savedReference.status()).toBe(201)
      await page.getByRole("button", { name: t.history, exact: true }).click()
      const savedRow = page.locator("main section > div").filter({ hasText: "QA-PEPTIDE-5" })
      await savedRow.getByRole("button", { name: t.load, exact: true }).click()
      await page.setViewportSize({ width: 1440, height: 900 })
      const otherLocale = locale === "fi" ? "en" : "fi"
      await page
        .getByRole("combobox", { name: m.nav.language, exact: true })
        .selectOption(otherLocale)
      await page.waitForURL(`**/${otherLocale}/peptide-calculator`)
      await expect(
        page.locator("main p .font-mono").filter({ hasText: "QA-PEPTIDE-5" }),
      ).toBeVisible()
      await page.goto(`/${locale}/peptide-calculator`)
      await page.getByRole("button", { name: t.history, exact: true }).click()
      for (let i = 0; i < 2; i++) {
        await page.getByRole("button", { name: t.delete, exact: true }).first().click()
        await expect(page.getByRole("button", { name: t.load, exact: true })).toHaveCount(1 - i)
      }
      await expect(
        page.locator("main").getByRole("button", { name: t.load, exact: true }),
      ).toHaveCount(0)
      await page.goto(`/${locale}/community/new`)
      const title = `Workspace question ${crypto.randomUUID()}`
      const body = `## Method\n\n${title}\n\nHow should this analytical method be documented for research?\n\nhttps://doi.org/10.1038/s41586-020-2649-2`
      await page.getByRole("textbox", { name: m.community.fieldTitle, exact: true }).fill(title)
      await page.getByRole("textbox", { name: m.community.fieldBody, exact: true }).fill(body)
      const draftSaved = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/forum/drafts") && response.request().method() === "PUT",
      )
      await page.getByRole("button", { name: m.community.saveDraft, exact: true }).click()
      expect((await draftSaved).status()).toBe(200)
      await page.reload()
      await page.getByRole("button", { name: m.community.loadDraft, exact: true }).click()
      await expect(
        page.getByRole("textbox", { name: m.community.fieldBody, exact: true }),
      ).toHaveValue(body)
      await page.getByRole("button", { name: m.community.preview, exact: true }).click()
      await expect(
        page.locator("main").getByRole("heading", { name: "Method", exact: true }),
      ).toBeVisible()
      const submitted = page.waitForResponse(
        (r) => r.url().endsWith("/api/forum/threads") && r.request().method() === "POST",
      )
      await page.getByRole("button", { name: m.community.submit, exact: true }).click()
      const response = await submitted
      expect(response.status()).toBe(201)
      const record = await response.json()
      await expect(page.locator("main")).toContainText(m.community.pendingTitle)
      const anonymousThread = await request.get(`/${locale}/community/thread/${record.slug}`, {
        maxRetries: 1,
      })
      const anonymousHtml = await anonymousThread.text()
      expect(anonymousHtml).not.toContain(title)
      expect(anonymousHtml).not.toContain("How should this analytical method be documented")
      expect(anonymousHtml).not.toContain('id="ld-forum-thread"')
      const publicHub = await request.get(`/${locale}/community`)
      expect(await publicHub.text()).not.toContain(title)
      const roleFixture = isolatedBrowserDatabase()
      await roleFixture`update users set role='moderator' where email=${email}`
      await roleFixture.end()
      await page.goto(`/${locale}/admin/moderation`)
      const queued = page.locator("main .space-y-3 > div").filter({ hasText: title })
      await expect(queued).toHaveCount(1)
      const decided = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/admin/moderation") &&
          response.request().method() === "POST",
      )
      await queued.getByRole("button", { name: m.admin.moderationUi.publish, exact: true }).click()
      expect((await decided).status()).toBe(200)
      await expect(queued).toHaveCount(0)
      expect(
        await (await request.get(`/${locale}/community/thread/${record.slug}`)).text(),
      ).toContain(title)
      await page.goto(`/${locale}/community/new`)
      await page.getByRole("button", { name: m.community.clearDraft, exact: true }).click()
    } finally {
      await cleanBrowserRecords(email)
    }
  })

  test(`${locale}: unavailable assistant keeps the question and retries without duplicate messages`, async ({
    cleanPage: page,
  }) => {
    const requests: Array<{ messages: Array<{ role: string; content: string }> }> = []
    await page.route("**/api/ai/chat", async (route) => {
      requests.push(route.request().postDataJSON())
      if (requests.length === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: true, code: "provider_unavailable" }),
        })
      } else {
        await route.fulfill({
          contentType: "text/event-stream",
          body: `data: ${JSON.stringify({ type: "text", delta: locale === "fi" ? "Pitoisuus on 5 mg/mL." : "The concentration is 5 mg/mL." })}\n\ndata: ${JSON.stringify({ type: "done", usage: { tokensIn: 1, tokensOut: 1, latencyMs: 1 } })}\n\n`,
        })
      }
    })
    await page.goto(`/${locale}/assistant`)
    const question =
      locale === "fi"
        ? "Laske pitoisuus: 10 mg ja lopullinen tilavuus 2 mL."
        : "Calculate concentration: 10 mg, final volume 2 mL."
    await page.locator("main textarea").fill(question)
    await page.locator("main").getByRole("button", { name: m.averia.send, exact: true }).click()
    await expect(page.locator("main")).toContainText(m.averia.errorOfflineBody)
    await expect(page.locator("main")).not.toContainText("MINIMAX_API_KEY")
    await page.locator("main").getByRole("button", { name: m.averia.retry, exact: true }).click()
    await expect(page.locator("main")).toContainText("5 mg/mL")
    expect(requests).toHaveLength(2)
    expect(
      requests[1]?.messages.filter(
        (message) => message.role === "user" && message.content === question,
      ),
    ).toHaveLength(1)
    await expect(page.locator("main").getByText(question, { exact: true })).toHaveCount(1)
  })

  test(`${locale}: interrupted and error streams expose a working retry`, async ({
    cleanPage: page,
  }) => {
    let calls = 0
    await page.route("**/api/ai/chat", async (route) => {
      calls++
      const events =
        calls === 1
          ? [{ type: "thinking", step: 1 }]
          : calls === 2
            ? [{ type: "error", message: "temporary_provider_failure" }]
            : [
                {
                  type: "text",
                  delta: locale === "fi" ? "Yhteys palautui." : "Connection recovered.",
                },
                { type: "done", usage: { tokensIn: 1, tokensOut: 1, latencyMs: 1 } },
              ]
      await route.fulfill({
        contentType: "text/event-stream",
        body: events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
      })
    })
    await page.goto(`/${locale}/assistant`)
    await page.locator("main textarea").fill("Check the available product records.")
    await page.locator("main").getByRole("button", { name: m.averia.send, exact: true }).click()
    for (let i = 0; i < 2; i++) {
      await expect(page.locator("main")).toContainText(m.averia.errorServerBody)
      await page.locator("main").getByRole("button", { name: m.averia.retry, exact: true }).click()
    }
    await expect(page.locator("main")).toContainText(
      locale === "fi" ? "Yhteys palautui." : "Connection recovered.",
    )
    expect(calls).toBe(3)
  })

  for (const width of [320, 390, 1440]) {
    test(`${locale}: research workspace fits ${width}px and has no blocking accessibility findings`, async ({
      cleanPage: page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      for (const path of [
        "/research-tools",
        "/peptide-calculator",
        "/community",
        "/community/new",
        "/assistant",
      ]) {
        await page.goto(`/${locale}${path}`)
        await expect(page.locator("main h1").first()).toBeVisible()
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          path,
        ).toBe(true)
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
        expect(
          scan.violations
            .filter((v) => v.impact === "serious" || v.impact === "critical")
            .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          path,
        ).toEqual([])
      }
    })
  }
}

test("switching Finnish calculator entries to English preserves quantities and selected units", async ({
  cleanPage: page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/fi/peptide-calculator")
  await page.getByRole("textbox", { name: "Materiaalin massa", exact: true }).fill("12,5")
  await page
    .getByRole("textbox", { name: "Liuoksen lopullinen tilavuus", exact: true })
    .fill("0,25")
  await page.getByRole("combobox", { name: "Materiaalin massa · Yksikkö" }).selectOption("mcg")
  await page.getByRole("combobox", { name: "Kieli", exact: true }).selectOption("en")
  await page.waitForURL("**/en/peptide-calculator")
  await expect(page.getByRole("textbox", { name: "Material mass", exact: true })).toHaveValue(
    "12500",
  )
  await expect(
    page.getByRole("textbox", { name: "Final solution volume", exact: true }),
  ).toHaveValue("0.25")
  await expect(page.getByRole("combobox", { name: "Material mass · Unit" })).toHaveValue("mcg")
  await expect(page.locator("main section[aria-live]")).toContainText("50 mg/mL")
})

test("a populated cart badge fits the narrow header", async ({ cleanPage: page }) => {
  await page.goto("/en/shop/qa-water")
  await page
    .locator("main")
    .getByRole("button", { name: /add to cart/i })
    .first()
    .click()
  await page.keyboard.press("Escape")
  await page.setViewportSize({ width: 320, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  )
  await expect(page.getByRole("button", { name: "Cart", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Æ AverianLabs", exact: true }).first()).toBeVisible()
})
