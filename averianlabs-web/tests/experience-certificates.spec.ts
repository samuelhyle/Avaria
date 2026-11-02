import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"
import { isolatedBrowserDatabase } from "@/tests/helpers/test-database"

const messages = Object.fromEntries(
  ["en", "fi", "sv"].map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")),
  ]),
)

/**
 * The batch certificate library.
 *
 * It lists released lots with a published certificate, and it says which lot
 * it is talking about. The suite reads only the owned local QA product; it
 * never modifies a merchant record.
 */
test.beforeEach(async ({ baseURL }) => {
  if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
    throw new Error("Certificate library fixtures require an explicit local browser target")
  const sql = isolatedBrowserDatabase()
  try {
    const [product] = await sql`select id, spec_json from products where slug='qa-peptide'`
    if (product?.spec_json?.evidenceRef !== "isolated-browser-fixture")
      throw new Error("Seed the owned local qa-peptide browser fixture before this suite")
  } finally {
    await sql.end()
  }
})

async function qaBatch() {
  const sql = isolatedBrowserDatabase()
  try {
    const rows =
      await sql`select b.code, b.hplc_purity, b.lab, b.reviewed_by, v.sku from batches b join vials v on v.id=b.vial_id join products p on p.id=v.product_id join documents d on d.batch_id=b.id where p.slug='qa-peptide' and d.requires_login=false and d.type='coa' and d.published_at<=now() and p.spec_json->>'evidenceRef'='isolated-browser-fixture'`
    const batch = rows[0] as
      | { code: string; hplc_purity: number; lab: string; reviewed_by: string; sku: string }
      | undefined
    if (!batch) throw new Error("An owned QA batch certificate is required")
    return batch
  } finally {
    await sql.end()
  }
}

for (const locale of ["en", "fi"]) {
  const t = messages[locale].certificates

  test(`${locale}: the certificate library lists a released lot with its assay`, async ({
    cleanPage: page,
  }) => {
    const batch = await qaBatch()
    await page.goto(`/${locale}/certificates`)
    const main = page.locator("main")
    await expect(main.getByRole("heading", { name: t.title, exact: true })).toBeVisible()

    await main.getByRole("searchbox", { name: t.filterq, exact: true }).fill(batch.code)
    await main.getByRole("button", { name: t.search, exact: true }).click()
    await expect(page).toHaveURL(/\/certificates\?.*q=/)

    // The lot is named, and the assay that produced the number is beside it.
    await expect(main.getByText(batch.code, { exact: true }).first()).toBeVisible()
    await expect(main.getByText(t.test, { exact: true }).first()).toBeVisible()
    await expect(main.getByText(t.method, { exact: true }).first()).toBeVisible()
    await expect(main.getByText(t.spec, { exact: true }).first()).toBeVisible()
    // A locally seeded lot is labelled as the demonstration record it is.
    await expect(main.getByText(t.demonstration, { exact: true }).first()).toBeVisible()
  })

  test(`${locale}: the certificate library filters by lot code`, async ({
    cleanPage: page,
  }) => {
    const batch = await qaBatch()
    await page.goto(`/${locale}/certificates?batch=${encodeURIComponent(batch.code)}`)
    const main = page.locator("main")
    await expect(main.getByText(batch.code, { exact: true }).first()).toBeVisible()

    await page.goto(`/${locale}/certificates?batch=NO-SUCH-BATCH`)
    await expect(main.getByRole("heading", { name: t.noMatchTitle, exact: true })).toBeVisible()

    await page.goto(
      `/${locale}/certificates?q=${encodeURIComponent(`no-such-certificate-${crypto.randomUUID()}`)}`,
    )
    await expect(main.getByRole("heading", { name: t.noMatchTitle, exact: true })).toBeVisible()
  })

  test(`${locale}: a product page links to the certificate library`, async ({
    cleanPage: page,
  }) => {
    const p = messages[locale].product
    await page.goto(`/${locale}/shop/qa-peptide`)
    const main = page.locator("main")
    await main.getByRole("tab", { name: p.tabCoa, exact: true }).click()
    await expect(
      main.getByRole("link", { name: t.browseCertificates, exact: true }).first(),
    ).toBeVisible()
  })
}

for (const locale of ["en", "fi", "sv"]) {
  const t = messages[locale].certificates

  test(`${locale}: the legacy COA address still lands on the document library with its filters`, async ({
    cleanPage: page,
  }) => {
    await page.goto(`/${locale}/coa?q=QA&type=sds`)
    await expect(page).toHaveURL(new RegExp(`/${locale}/documents\\?`))
    const redirected = new URL(page.url())
    expect(redirected.searchParams.get("type")).toBe("coa")
    expect(redirected.searchParams.get("q")).toBe("QA")
  })
}

test("sv: a certificate published only in English and Finnish is not shown as Swedish evidence", async ({
  cleanPage: page,
}) => {
  await page.goto("/sv/certificates")
  const main = page.locator("main")
  // The owned QA fixture publishes its certificate for en and fi only. A
  // Swedish reader must not be shown it as though it were Swedish evidence.
  await expect(main.getByText("Automated test fixture", { exact: false })).toHaveCount(0)
})
