import { readFileSync } from "node:fs"
import { expect, test } from "@/tests/fixtures"
import { isolatedBrowserDatabase } from "@/tests/helpers/test-database"

const messages = Object.fromEntries(
  ["en", "fi"].map((locale) => [
    locale,
    JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")),
  ]),
)

/**
 * The product media gallery.
 *
 * A vial label is unreadable in a picture, so the product page draws it again
 * at reading size with the lot's own numbers, and it draws the lot's assay
 * results against the specification they were measured to. Both views must
 * carry the lot's real record, and both must be reachable without a mouse.
 */
test.beforeEach(async ({ baseURL }) => {
  if (!baseURL || !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
    throw new Error("Product media fixtures require an explicit local browser target")
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
      await sql`select b.code, b.hplc_purity, v.sku, ct.result as result, ct.spec as spec from batches b join vials v on v.id=b.vial_id join products p on v.product_id=p.id join documents d on d.batch_id=b.id join coa_tests ct on ct.batch_id=b.id where p.slug='qa-peptide' and d.requires_login=false and d.type='coa' and d.published_at<=now() and ct.test_name='HPLC purity' and p.spec_json->>'evidenceRef'='isolated-browser-fixture' order by v.sku limit 1`
    const batch = rows[0] as
      | { code: string; hplc_purity: number; sku: string; result: string; spec: string }
      | undefined
    if (!batch) throw new Error("An owned QA batch certificate is required")
    return batch
  } finally {
    await sql.end()
  }
}

for (const locale of ["en", "fi"]) {
  const p = messages[locale].product

  test(`${locale}: the media views carry the lot's own record`, async ({ cleanPage: page }) => {
    const batch = await qaBatch()
    await page.goto(`/${locale}/shop/qa-peptide?sku=${batch.sku}`)

    const studio = page.getByRole("tab", { name: p.mediaStudio, exact: true })
    const label = page.getByRole("tab", { name: p.mediaLabel, exact: true })
    const quality = page.getByRole("tab", { name: p.mediaQuality, exact: true })

    await expect(studio).toBeVisible()
    await expect(label).toBeVisible()
    await expect(quality).toBeVisible()

    // The label view prints the lot code that is on the vial.
    await label.click()
    await expect(page.getByRole("img", { name: /Label of/i })).toBeVisible()
    await expect(page.getByRole("img", { name: /Label of/i })).toContainText(batch.code)

    // The quality view draws the measured result and the specification it was
    // measured against, and says which way the comparison went.
    await quality.click()
    const panel = page.locator("#media-panel-quality")
    const chart = panel.getByRole("img", { name: /HPLC purity/i })
    await expect(chart).toBeVisible()
    await expect(chart).toHaveAttribute("aria-label", /% area/)
    await expect(panel.getByText(batch.result, { exact: true })).toBeVisible()
    await expect(panel.getByText(batch.spec, { exact: true })).toBeVisible()
    await expect(
      panel.getByText(messages[locale].certificates.pass, { exact: true }).first(),
    ).toBeVisible()
  })

  test(`${locale}: the media views are reachable from the keyboard`, async ({
    cleanPage: page,
  }) => {
    await page.goto(`/${locale}/shop/qa-peptide`)

    const studio = page.getByRole("tab", { name: p.mediaStudio, exact: true })
    await studio.focus()
    await page.keyboard.press("ArrowRight")

    const label = page.getByRole("tab", { name: p.mediaLabel, exact: true })
    await expect(label).toBeFocused()
    await expect(label).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("img", { name: /Label of/i })).toBeVisible()

    await page.keyboard.press("ArrowRight")
    const quality = page.getByRole("tab", { name: p.mediaQuality, exact: true })
    await expect(quality).toBeFocused()
    await expect(quality).toHaveAttribute("aria-selected", "true")
  })
}
