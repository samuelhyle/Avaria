/**
 * i18n regression — the bulk-discount nudge keys were renamed in every
 * locale from `bulkNudge5/11/21` (minQty-based) to `bulkNudge10/15/20`
 * (percent-based). The component looks up `bulkNudge${pct}` — this
 * test pins the contract that every locale ships the renamed keys.
 */

import { afterEach, describe, expect, it } from "vitest"

import de from "@/messages/de.json"
import en from "@/messages/en.json"
import fi from "@/messages/fi.json"
import nl from "@/messages/nl.json"
import sv from "@/messages/sv.json"

const locales = { en, de, fi, sv, nl }

const PERCENT_KEYS = [
  "bulkNudge10",
  "bulkNudge15",
  "bulkNudge20",
  "bulkNudge10_plural",
  "bulkNudge15_plural",
  "bulkNudge20_plural",
] as const

const TIER_KEYS = ["bulkTier10", "bulkTier15", "bulkTier20"] as const

describe("bulk-discount i18n keys", () => {
  for (const [locale, data] of Object.entries(locales)) {
    it(`${locale} has all renamed nudge keys`, () => {
      for (const key of PERCENT_KEYS) {
        const checkout = (data as { checkout?: Record<string, unknown> }).checkout
        expect(typeof checkout?.[key]).toBe("string")
        expect((checkout?.[key] as string).length).toBeGreaterThan(0)
      }
    })

    it(`${locale} has all tier keys`, () => {
      for (const key of TIER_KEYS) {
        const checkout = (data as { checkout?: Record<string, unknown> }).checkout
        expect(typeof checkout?.[key]).toBe("string")
      }
    })

    it(`${locale} no longer has the old minQty-based keys`, () => {
      const checkout = (data as { checkout?: Record<string, unknown> }).checkout
      // The pre-fix keys. If any of these appear, the rename was missed.
      expect(checkout).not.toHaveProperty("bulkNudge5")
      expect(checkout).not.toHaveProperty("bulkNudge5_plural")
      expect(checkout).not.toHaveProperty("bulkNudge11")
      expect(checkout).not.toHaveProperty("bulkNudge11_plural")
      expect(checkout).not.toHaveProperty("bulkNudge21")
      expect(checkout).not.toHaveProperty("bulkNudge21_plural")
    })
  }
})
