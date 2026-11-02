#!/usr/bin/env node
/**
 * Narrow-viewport overflow check.
 *
 * A translated string can be longer than its English source, and a single
 * long word (a Finnish compound, for example) can push a page past the
 * viewport on a small phone. The browser suite only covered English and
 * Finnish on five routes; this walks every route in every locale at 320px
 * and reports the elements that stick out.
 *
 * Usage:
 *   pnpm start &
 *   BASE_URL=http://localhost:3000 node scripts/check-narrow-overflow.mjs
 *
 * Options:
 *   --locale=en     only check one locale
 *   --width=320     viewport width (default 320)
 */
import { chromium } from "@playwright/test"

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"
const args = process.argv.slice(2)
const onlyLocale = args.includes("--locale") ? args[args.indexOf("--locale") + 1] : null
const width = args.includes("--width") ? Number(args[args.indexOf("--width") + 1]) : 320

const LOCALES = ["en", "fi", "sv", "ru"]

const ROUTES = [
  "",
  "/shop",
  "/shop/bpc-157",
  "/shop/qa-water",
  "/about",
  "/quality",
  "/faq",
  "/contact",
  "/glossary",
  "/community",
  "/blog",
  "/lab-tests",
  "/documents",
  "/certificates",
  "/research-tools",
  "/peptide-calculator",
  "/rewards",
  "/partner",
  "/coa",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  "/legal/research-disclaimer",
  "/support/shipping-returns",
  "/register",
  "/forgot-password",
  "/account",
  "/wishlist",
  "/compare",
  "/checkout/cart",
  "/assistant",
]

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
})
const context = await browser.newContext({ viewport: { width, height: 850 } })
await context.addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: BASE_URL }])
await context.addInitScript(() => localStorage.setItem("averianlabs-cookie-consent", "essential"))

let failed = false
let checked = 0

for (const locale of onlyLocale ? [onlyLocale] : LOCALES) {
  for (const route of ROUTES) {
    const path = `/${locale}${route}`
    const page = await context.newPage()
    try {
      const response = await page.goto(`${BASE_URL}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      })
      if (!response?.ok()) continue
      await page.waitForTimeout(600)
      checked += 1

      const result = await page.evaluate((viewportWidth) => {
        const doc = document.documentElement
        const offenders = []
        for (const el of document.querySelectorAll("body *")) {
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 && rect.height === 0) continue
          // Fixed elements are positioned against the viewport, so they are
          // reported by the browser anyway.
          const style = getComputedStyle(el)
          if (style.position === "fixed") continue
          if (rect.right > viewportWidth + 1 || rect.left < -1) {
            // Only report the outermost offender in a chain.
            const parent = el.parentElement
            const parentOverflows =
              parent && parent.getBoundingClientRect().right > viewportWidth + 1
            if (parentOverflows) continue
            offenders.push({
              tag: el.tagName,
              cls: (el.className?.baseVal ?? el.className ?? "").toString().slice(0, 90),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              text: (el.textContent ?? "").trim().slice(0, 60),
            })
          }
        }
        return { scrollWidth: doc.scrollWidth, offenders: offenders.slice(0, 5) }
      }, width)

      if (result.scrollWidth > width + 1) {
        failed = true
        console.log(`\nFAIL ${path} — scrollWidth ${result.scrollWidth} > ${width}`)
        for (const o of result.offenders) {
          console.log(`   <${o.tag}> [${o.left}..${o.right}] ${o.cls} | ${JSON.stringify(o.text)}`)
        }
      }
    } catch (err) {
      failed = true
      console.log(`ERROR ${path}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      await page.close()
    }
  }
}

await browser.close()

console.log(`\nChecked ${checked} route/locale combinations at ${width}px.`)
if (failed) {
  console.error("Narrow-viewport overflow detected.")
  process.exit(1)
}
console.log("No horizontal overflow.")
