import { describe, expect, it } from "vitest"
import { renderCatalogueAnswer } from "./catalogue"
const vial = {
  sku: "BACW-10",
  sizeValue: 10,
  sizeUnit: "mL",
  purchaseMode: "unavailable",
  stockQty: 0,
  priceCents: 0,
}
const product = { slug: "bac-water", name: "BAC water", vials: [vial] }
for (const locale of ["en", "fi"])
  describe(`controlled catalogue answers: ${locale}`, () => {
    it("preserves physical units and unavailable status without claiming zero-price sales or purity", () => {
      const answer = renderCatalogueAnswer([{ name: "getProduct", result: product }], locale)
      expect(answer).toContain("10 mL")
      expect(answer).not.toContain("10 mg")
      expect(answer).not.toContain("`unavailable`")
      expect(answer).not.toMatch(/0\s*€|€\s*0|99|HPLC/)
      expect(answer).toContain(locale === "fi" ? "Ei saatavilla" : "Currently unavailable")
    })
    it("includes an actual direct-sale price and never labels a zero-price record available", () => {
      const available = {
        ...product,
        vials: [{ ...vial, purchaseMode: "direct", stockQty: 2, priceCents: 995 }],
      }
      const answer = renderCatalogueAnswer([{ name: "getProduct", result: available }], locale)
      expect(answer).toContain(locale === "fi" ? "9,95" : "9.95")
      const invalid = { ...product, vials: [{ ...vial, purchaseMode: "direct", stockQty: 2 }] }
      expect(renderCatalogueAnswer([{ name: "getProduct", result: invalid }], locale)).toContain(
        locale === "fi" ? "Ei saatavilla" : "Currently unavailable",
      )
    })
    it("distinguishes missing documents from missing released batch evidence", () => {
      expect(
        renderCatalogueAnswer(
          [{ name: "getDocuments", result: { slug: "bac-water", documents: [] } }],
          locale,
        ),
      ).toContain(locale === "fi" ? "Ei julkisesti" : "No publicly")
      expect(
        renderCatalogueAnswer(
          [{ name: "getBatches", result: { slug: "bac-water", batches: [] } }],
          locale,
        ),
      ).toContain(locale === "fi" ? "vapautetun erän" : "Released batch")
    })
    it("uses customer labels in exact-SKU comparisons without inventing future notifications", () => {
      const answer = renderCatalogueAnswer(
        [
          {
            name: "compareProducts",
            result: {
              products: [
                {
                  slug: "bac-water",
                  name: "BAC water",
                  category: "recovery",
                  variants: [
                    { ...vial, size: "10 mL", documentsAvailable: false, batchCode: null },
                  ],
                },
              ],
            },
          },
        ],
        locale,
      )
      expect(answer).toContain("BACW-10")
      expect(answer).toContain("10 mL")
      expect(answer).not.toMatch(
        /recovery|purchaseMode|`unavailable`|notify|ilmoitamme|latestBatch/,
      )
    })
    it("gives a clear no-match answer from a failed lookup without inventing an SKU", () => {
      const answer = renderCatalogueAnswer(
        [{ name: "getProduct", result: { error: "not_found" } }],
        locale,
      )
      expect(answer).toContain(locale === "fi" ? "Tuotteita ei löytynyt" : "No matching products")
      expect(answer).not.toContain("UNKNOWN999-999")
    })
    it("leaves community and confirmed-action narratives to their own workflow", () => {
      expect(
        renderCatalogueAnswer(
          [
            { name: "getProduct", result: product },
            { name: "prepareCommunityDraft", result: { draft: "Question" } },
          ],
          locale,
        ),
      ).toBeNull()
    })
  })
