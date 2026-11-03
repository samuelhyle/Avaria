import { describe, expect, it } from "vitest"
import { labelIsPending, labelRows } from "./label-record"

const product = {
  purityPercent: 99.2,
  molecularWeight: 1419.5,
  casNumber: "137525-50-9",
  storageTemp: "−20 °C, desiccated",
}

const batch = {
  code: "BPC157-5-202611",
  manufacturedAt: "2026-06-01",
  expiresAt: "2028-06-01",
  hplcPurity: 99.4,
  endotoxinEUPerMg: 2.1,
  msConfirmed: true,
  lab: "Example laboratory",
}

describe("labelRows", () => {
  it("carries the lot's own record", () => {
    const rows = labelRows(product, { sku: "BPC157-5" }, batch, "en")
    expect(rows.map((row) => row.label)).toEqual([
      "Lot",
      "Purity",
      "MW",
      "CAS",
      "Storage",
      "Expiry",
      "SKU",
    ])
    expect(rows.find((row) => row.label === "Purity")?.value).toBe("99.4 % HPLC")
    expect(rows.find((row) => row.label === "Lot")?.value).toBe("BPC157-5-202611")
  })

  it("leaves out a value the lot does not have", () => {
    const rows = labelRows(product, { sku: "BPC157-5" }, batch, "en")
    expect(rows).toHaveLength(7)
    const sparse = labelRows(
      {
        purityPercent: undefined,
        molecularWeight: undefined,
        casNumber: undefined,
        storageTemp: "",
      },
      { sku: "BPC157-5" },
      undefined,
      "en",
    )
    expect(sparse.map((row) => row.label)).toEqual(["SKU"])
  })

  it("falls back to the product's purity when the lot carries none", () => {
    const rows = labelRows(product, { sku: "BPC157-5" }, undefined, "en")
    expect(rows.find((row) => row.label === "Purity")?.value).toBe("99.2 % HPLC")
  })

  it("does not print a purity of zero", () => {
    const rows = labelRows({ ...product, purityPercent: 0 }, { sku: "X" }, undefined, "en")
    expect(rows.find((row) => row.label === "Purity")).toBeUndefined()
  })
})

describe("labelIsPending", () => {
  it("is pending when there is no lot and nothing to print", () => {
    const rows = labelRows(
      {
        purityPercent: undefined,
        molecularWeight: undefined,
        casNumber: undefined,
        storageTemp: "",
      },
      { sku: "X" },
      undefined,
      "en",
    )
    expect(labelIsPending(rows, undefined)).toBe(true)
  })

  it("is not pending when the lot is released", () => {
    const rows = labelRows(product, { sku: "X" }, batch, "en")
    expect(labelIsPending(rows, batch)).toBe(false)
  })

  it("is not pending when the product carries a record of its own", () => {
    const rows = labelRows(product, { sku: "X" }, undefined, "en")
    expect(labelIsPending(rows, undefined)).toBe(false)
  })
})
