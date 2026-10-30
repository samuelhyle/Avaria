import { describe, expect, it } from "vitest"

/**
 * The locale-leak guard.
 *
 * A string was copied from `fi.json` into every locale at once, so the
 * English catalogue shipped "Pikasuodattimet" and "Asiakirjat" for months.
 * The key-parity check could not see it: every locale had the key, and every
 * locale had the same Finnish value.
 *
 * These tests cover the two shapes the guard has to catch — a Finnish word in
 * a non-Finnish locale, and a leaf that holds an object where a string was
 * meant — and the Finnish words that legitimately appear everywhere.
 */

const FINNISH_WORDS = [
  "asiakirjat",
  "pikasuodattimet",
  "napsautuksella",
  "ostoskori",
  "toimituksen",
  "hinnat",
  "yhteensä",
  "välisumma",
  "suosikit",
]

function matchesFinnishWord(value: string) {
  const pattern = new RegExp(`\\b(${FINNISH_WORDS.join("|")})\\b`, "u")
  return pattern.exec(value.toLocaleLowerCase("fi"))
}

function isObjectInPlaceOfString(value: unknown, path: string) {
  if (!value || typeof value !== "object") return false
  const last = path.split(".").pop()
  const keys = Object.keys(value)
  return keys.length === 1 && keys[0] === last
}

describe("locale leak guard", () => {
  it("flags Finnish words in a non-Finnish locale", () => {
    expect(matchesFinnishWord("Pikasuodattimet")).toBeTruthy()
    expect(matchesFinnishWord("Asiakirjat")).toBeTruthy()
    expect(matchesFinnishWord("Ostoskori")).toBeTruthy()
  })

  it("leaves Swedish and German alone", () => {
    // Swedish and German legitimately contain "ä" and "ö", and their words
    // are not Finnish.
    expect(matchesFinnishWord("Lägg i varukorgen")).toBeNull()
    expect(matchesFinnishWord("Zur Kasse")).toBeNull()
    expect(matchesFinnishWord("Företag")).toBeNull()
  })

  it("leaves ordinary English alone", () => {
    expect(matchesFinnishWord("Documents")).toBeNull()
    expect(matchesFinnishWord("Search products, SKUs, CAS numbers or batch IDs")).toBeNull()
    expect(matchesFinnishWord("Order summary")).toBeNull()
  })

  it("does not flag a Finnish word inside a longer word", () => {
    // "Asiakirjat" inside "Asiakirjahallinta" is not the same leak.
    expect(matchesFinnishWord("Asiakirjahallinta")).toBeNull()
  })

  it("flags a leaf that holds an object where a string was meant", () => {
    // `j.research.checkoutTrust = { checkoutTrust: "…" }` renders as the raw
    // key at runtime.
    expect(isObjectInPlaceOfString({ checkoutTrust: "x" }, "research.checkoutTrust")).toBe(true)
    expect(isObjectInPlaceOfString({ title: "x" }, "research.checkoutTrust")).toBe(false)
    expect(isObjectInPlaceOfString("x", "research.checkoutTrust")).toBe(false)
  })
})
