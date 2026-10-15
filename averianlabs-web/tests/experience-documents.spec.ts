import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"
import { isolatedBrowserDatabase } from "@/tests/helpers/test-database"

const messages = Object.fromEntries(
  ["en", "fi", "sv"].map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")),
  ]),
)

// This suite reads only explicitly seeded local QA products. Its optional records have
// unique IDs and are deleted individually; it never modifies a merchant/source record.
test.beforeEach(async ({ baseURL }) => {
  if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
    throw new Error("Document experience fixtures require an explicit local browser target")
  const sql = isolatedBrowserDatabase()
  try {
    const [product] = await sql`select id, spec_json from products where slug='qa-peptide'`
    if (product?.spec_json?.evidenceRef !== "isolated-browser-fixture")
      throw new Error("Seed the owned local qa-peptide browser fixture before this suite")
  } finally {
    await sql.end()
  }
})

async function qaRecords() {
  const sql = isolatedBrowserDatabase()
  try {
    const rows =
      await sql`select d.id, v.sku from documents d join batches b on b.id=d.batch_id join vials v on v.id=b.vial_id join products p on p.id=v.product_id where p.slug='qa-peptide' and d.requires_login=false and d.type='coa' and d.published_at<=now() and p.spec_json->>'evidenceRef'='isolated-browser-fixture'`
    const five = rows.find((row) => row.sku === "QA-PEPTIDE-5")?.id as string | undefined
    const ten = rows.find((row) => row.sku === "QA-PEPTIDE-10")?.id as string | undefined
    if (!five || !ten) throw new Error("Both owned QA batch reports are required")
    return { five, ten }
  } finally {
    await sql.end()
  }
}

async function withProductDocument(
  original: boolean,
  use: (fixture: { id: string; title: string }) => Promise<void>,
) {
  const sql = isolatedBrowserDatabase()
  const id = `browser-qa-document-${crypto.randomUUID()}`
  const title = `QA product-wide document — not supplier evidence — ${id}`
  try {
    const [product] =
      await sql`select id from products where slug='qa-peptide' and spec_json->>'evidenceRef'='isolated-browser-fixture'`
    if (!product) throw new Error("Owned QA product is missing")
    await sql`insert into documents (id,product_id,batch_id,type,title,version,external_url,display_locales,requires_login,published_at) values (${id},${product.id},null,'spec',${title},'qa-1',${original ? "https://example.invalid/qa-product-specification.pdf" : null},ARRAY['en','fi']::text[],false,'2026-01-01')`
    await use({ id, title })
  } finally {
    await sql`delete from documents where id=${id} and title=${title}`
    await sql.end()
  }
}

for (const locale of ["en", "fi"]) {
  const t = messages[locale].documentLibrary
  test(`${locale}: mobile document filters and legacy COA links preserve exact search context`, async ({
    cleanPage: page,
  }) => {
    const records = await qaRecords()
    await page.setViewportSize({ width: 320, height: 850 })
    await page.goto(`/${locale}/documents`)
    const main = page.locator("main")
    await main
      .getByRole("searchbox", { name: t.filterq, exact: true })
      .fill("Automated test fixture report")
    await main.getByRole("searchbox", { name: t.filterproduct, exact: true }).fill("qa-peptide")
    await main.getByRole("searchbox", { name: t.filtersku, exact: true }).fill("QA-PEPTIDE-5")
    await main
      .getByRole("searchbox", { name: t.filterbatch, exact: true })
      .fill("QA-PEPTIDE-5-BATCH")
    await main.getByRole("combobox", { name: t.filtertype, exact: true }).selectOption("coa")
    await main.getByRole("button", { name: t.search, exact: true }).click()
    await expect(page).toHaveURL(/\/documents\?.*type=coa/)
    await expect(main.locator(`a[href="/${locale}/documents/${records.five}"]`)).toBeVisible()
    await expect(main.locator(`a[href="/${locale}/documents/${records.ten}"]`)).toHaveCount(0)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    )
    expect(overflow).toBe(false)
    const query = new URLSearchParams({
      q: "QA-PEPTIDE-5-BATCH",
      product: "qa-peptide",
      sku: "QA-PEPTIDE-5",
      batch: "QA-PEPTIDE-5-BATCH",
      type: "sds",
    })
    await page.goto(`/${locale}/coa?${query}`)
    await expect(page).toHaveURL(/\/documents\?/)
    const redirected = new URL(page.url())
    expect(redirected.searchParams.get("type")).toBe("coa")
    for (const key of ["q", "product", "sku", "batch"])
      expect(redirected.searchParams.get(key)).toBe(query.get(key))
    await expect(main.locator(`a[href="/${locale}/documents/${records.five}"]`)).toBeVisible()
    await main
      .getByRole("searchbox", { name: t.filterq, exact: true })
      .fill(`no-such-qa-document-${crypto.randomUUID()}`)
    await main.getByRole("button", { name: t.search, exact: true }).click()
    await expect(main.getByRole("heading", { name: t.noMatchTitle, exact: true })).toBeVisible()
    await expect(main.getByRole("heading", { name: t.emptyTitle, exact: true })).toHaveCount(0)
    await main.getByRole("link", { name: t.clear, exact: true }).first().click()
    await expect(page).toHaveURL(new RegExp(`/${locale}/documents$`))
    for (const name of [t.filterq, t.filterproduct, t.filtersku, t.filterbatch])
      await expect(main.getByRole("searchbox", { name, exact: true })).toHaveValue("")
    await expect(main.getByRole("combobox", { name: t.filtertype, exact: true })).toHaveValue("")
    await expect(main.locator(`a[href="/${locale}/documents/${records.five}"]`)).toBeVisible()
  })

  test(`${locale}: changing SKU keeps product-wide documents and shows only the applicable batch`, async ({
    cleanPage: page,
  }) => {
    const records = await qaRecords()
    await withProductDocument(true, async (fixture) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`/${locale}/shop/qa-peptide?sku=QA-PEPTIDE-5&review=documents#records`)
      const link = (id: string, language = locale) =>
        page.locator(`main a[href="/${language}/documents/${id}"]`)
      await expect(link(records.five)).toBeVisible()
      await expect(link(records.ten)).toHaveCount(0)
      await expect(link(fixture.id)).toBeVisible()
      await page
        .locator("main fieldset")
        .getByRole("button")
        .filter({ hasText: "QA-PEPTIDE-10" })
        .click()
      await expect(page).toHaveURL(/sku=QA-PEPTIDE-10/)
      await expect(link(records.ten)).toBeVisible()
      await expect(link(records.five)).toHaveCount(0)
      await expect(link(fixture.id)).toBeVisible()
      expect(new URL(page.url()).searchParams.get("review")).toBe("documents")
      expect(new URL(page.url()).hash).toBe("#records")
      const other = locale === "fi" ? "en" : "fi"
      await page
        .getByRole("combobox", { name: messages[locale].nav.language, exact: true })
        .selectOption(other)
      await expect(page).toHaveURL(new RegExp(`/${other}/shop/qa-peptide`))
      expect(new URL(page.url()).searchParams.get("sku")).toBe("QA-PEPTIDE-10")
      await expect(link(records.ten, other)).toBeVisible()
      await expect(link(records.five, other)).toHaveCount(0)
      await expect(link(fixture.id, other)).toBeVisible()
    })
  })

  test(`${locale}: a missing original file has retry and documentation help without hiding the record`, async ({
    cleanPage: page,
  }) => {
    await withProductDocument(false, async (fixture) => {
      await page.goto(`/${locale}/documents/${fixture.id}`)
      const main = page.locator("main")
      await expect(main.getByRole("heading", { name: fixture.title, exact: true })).toBeVisible()
      await expect(
        main.getByRole("heading", { name: t.fileUnavailableTitle, exact: true }),
      ).toBeVisible()
      await expect(main).toContainText(t.productScope)
      await expect(
        main.getByRole("link", { name: messages[locale].research.download, exact: true }),
      ).toHaveCount(0)
      const refreshed = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === `/${locale}/documents/${fixture.id}` &&
          response.request().headers().rsc === "1",
      )
      await main.getByRole("button", { name: t.retry, exact: true }).click()
      expect((await refreshed).ok()).toBe(true)
      await expect(
        main.getByRole("heading", { name: t.fileUnavailableTitle, exact: true }),
      ).toBeVisible()
      await expect(main.getByRole("link", { name: t.enquiry, exact: true })).toHaveAttribute(
        "href",
        `/${locale}/contact`,
      )
    })
  })
}

test("an actually empty language collection differs from a failed search in the seeded library", async ({
  cleanPage: page,
}) => {
  const sql = isolatedBrowserDatabase()
  try {
    const [count] =
      await sql`select count(*)::int as total from documents where 'sv'=any(display_locales) and requires_login=false and published_at<=now()`
    test.skip(
      Number(count?.total) !== 0,
      "The isolated Swedish collection contains other test records; no existing data is removed to fabricate emptiness",
    )
  } finally {
    await sql.end()
  }
  await page.goto("/sv/documents")
  const t = messages.sv.documentLibrary
  await expect(
    page.locator("main").getByRole("heading", { name: t.emptyTitle, exact: true }),
  ).toBeVisible()
  await expect(
    page.locator("main").getByRole("heading", { name: t.noMatchTitle, exact: true }),
  ).toHaveCount(0)
  await expect(
    page.locator("main").getByRole("link", { name: t.enquiry, exact: true }),
  ).toHaveAttribute("href", "/sv/contact")
})
