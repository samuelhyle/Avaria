import { products } from "@/lib/products/data"
import { describe, expect, it } from "vitest"
import { exactSkuVariant } from "./variant"

const peptide = products.find((product) => product.slug === "bpc-157")
const water = products.find((product) => product.slug === "bac-water")
if (!peptide || !water) throw new Error("Required reference fixtures are missing")

describe("exact SKU discovery", () => {
  it("matches the complete SKU with surrounding whitespace and case differences", () => {
    const ten = peptide.vials.find((variant) => variant.sku === "BPC157-10")
    if (!ten) throw new Error("Required ten-milligram reference variant is missing")
    expect(exactSkuVariant(peptide, "  bpc157-10  ")).toBe(ten)
    expect(exactSkuVariant(peptide, "BPC157-5")?.sizeValue).toBe(5)
  })
  it.each(["", " ", "BPC157", "BPC157-1", "157-10", "BPC157-10 extra", "BPC157 -10", "BPC-157"])(
    "does not infer a variant from an incomplete/general query: %s",
    (query) => {
      expect(exactSkuVariant(peptide, query)).toBeUndefined()
    },
  )
  it("never selects an exact SKU belonging to a different product", () => {
    expect(exactSkuVariant(peptide, "BACW-10")).toBeUndefined()
    expect(exactSkuVariant(water, "BPC157-10")).toBeUndefined()
    expect(exactSkuVariant(water, "bacw-10")?.sizeUnit).toBe("mL")
  })
})
