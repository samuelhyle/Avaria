/**
 * Runtime audit — walks every public route in every locale against a running
 * server and reports what a visitor would actually experience:
 *
 *   - console errors and warnings
 *   - uncaught page exceptions (hydration mismatches land here)
 *   - failed network requests (404 assets, 500 APIs)
 *   - a server-rendered HTML sanity check (one <h1>, no missing-translation
 *     markers, no raw ICU placeholders left in the visible text)
 *   - the visible text of the page, so untranslated copy can be eyeballed
 *
 * Usage:
 *   pnpm start &
 *   BASE_URL=http://localhost:3000 node scripts/runtime-audit.mjs
 *
 * Options:
 *   --locale=en        only audit one locale (default: all)
 *   --json             machine-readable output
 */
import { chromium } from "@playwright/test"

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"
const args = process.argv.slice(2)
const onlyLocale = args.includes("--locale") ? args[args.indexOf("--locale") + 1] : null
const asJson = args.includes("--json")

const LOCALES = ["en", "fi", "sv", "ru"]

const ROUTES = [
  "",
  "/shop",
  "/shop/bpc-157",
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

const IGNORED_CONSOLE = [/favicon/i, /Download the React DevTools/i, /\[vite\]/i, /source-?map/i]

const IGNORED_REQUEST = [/favicon\.ico/i, /sw\.js/i, /_rsc\?/i]

const IGNORED_FAILURE = [/net::ERR_ABORTED/i, /Failed to load resource.*favicon/i]

/** Strings next-intl emits when a key is missing. */
const MISSING_MESSAGE = /MISSING_MESSAGE/

/** An un-interpolated ICU placeholder, e.g. "{name}" left in the output. */
const RAW_PLACEHOLDER = /\{[a-zA-Z][a-zA-Z0-9_]*\}/

function isNoise(text) {
  return IGNORED_CONSOLE.some((re) => re.test(text))
}

function isNoiseRequest(text) {
  return IGNORED_REQUEST.some((re) => re.test(text))
}

function isNoiseFailure(text) {
  return IGNORED_FAILURE.some((re) => re.test(text))
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: BASE_URL }])
await context.addInitScript(() => localStorage.setItem("averianlabs-cookie-consent", "essential"))

const report = []

for (const locale of onlyLocale ? [onlyLocale] : LOCALES) {
  for (const route of ROUTES) {
    const path = `/${locale}${route}`
    const page = await context.newPage()
    const consoleErrors = []
    const consoleWarnings = []
    const pageErrors = []
    const failedRequests = []
    const badResponses = []

    page.on("console", (msg) => {
      const text = msg.text()
      if (msg.type() === "error" && !isNoise(text)) consoleErrors.push(text)
      if (msg.type() === "warning" && !isNoise(text)) consoleWarnings.push(text)
    })
    page.on("pageerror", (err) => pageErrors.push(err.message))
    page.on("requestfailed", (req) => {
      const text = `${req.url()} ${req.failure()?.errorText ?? ""}`
      if (!isNoiseRequest(text) && !isNoiseFailure(text)) failedRequests.push(text)
    })
    page.on("response", (res) => {
      if (res.status() >= 400 && !isNoiseRequest(res.url())) {
        badResponses.push(`${res.status()} ${res.url()}`)
      }
    })

    let status = 0
    let note = null
    try {
      const res = await page.goto(`${BASE_URL}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      })
      status = res?.status() ?? 0
      await page.waitForTimeout(1200)

      const audit = await page.evaluate(() => {
        const h1s = Array.from(document.querySelectorAll("h1")).map(
          (h) => h.textContent?.trim() ?? "",
        )
        const text = document.body.innerText ?? ""
        const missing = text.match(/MISSING_MESSAGE[^"']*/g) ?? []
        const placeholders = Array.from(new Set(text.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) ?? []))
        const imgsNoAlt = Array.from(document.querySelectorAll("img")).filter(
          (img) => !img.hasAttribute("alt"),
        ).length
        const linksNoText = Array.from(document.querySelectorAll("a")).filter((a) => {
          const label = (a.textContent ?? "").trim()
          return !label && !a.getAttribute("aria-label") && !a.querySelector("[aria-label]")
        }).length
        const buttonsNoName = Array.from(document.querySelectorAll("button")).filter((b) => {
          const label = (b.textContent ?? "").trim()
          return !label && !b.getAttribute("aria-label") && !b.getAttribute("title")
        }).length
        const emptyLinks = Array.from(document.querySelectorAll("a")).filter(
          (a) => !a.getAttribute("href"),
        ).length
        const title = document.title
        return {
          h1s,
          missing,
          placeholders,
          imgsNoAlt,
          linksNoText,
          buttonsNoName,
          emptyLinks,
          title,
          textSample: text.replace(/\s+/g, " ").slice(0, 600),
        }
      })

      note = audit
    } catch (err) {
      note = { error: err instanceof Error ? err.message : String(err) }
    } finally {
      await page.close()
    }

    const entry = {
      path,
      status,
      consoleErrors,
      consoleWarnings,
      pageErrors,
      failedRequests,
      badResponses,
      ...note,
    }
    report.push(entry)

    const problems =
      status >= 400 ||
      consoleErrors.length ||
      pageErrors.length ||
      failedRequests.length ||
      badResponses.length ||
      note?.missing?.length ||
      note?.placeholders?.length ||
      note?.imgsNoAlt ||
      note?.linksNoText ||
      note?.buttonsNoName ||
      note?.emptyLinks

    if (problems) {
      console.log(`\n── ${path} [${status}]`)
      if (consoleErrors.length)
        console.log(`  console.error: ${consoleErrors.slice(0, 6).join(" | ")}`)
      if (consoleWarnings.length)
        console.log(`  console.warn : ${consoleWarnings.slice(0, 4).join(" | ")}`)
      if (pageErrors.length) console.log(`  pageerror   : ${pageErrors.slice(0, 4).join(" | ")}`)
      if (failedRequests.length)
        console.log(`  failed req  : ${failedRequests.slice(0, 4).join(" | ")}`)
      if (badResponses.length)
        console.log(`  bad response: ${badResponses.slice(0, 4).join(" | ")}`)
      if (note?.missing?.length)
        console.log(`  missing msg : ${note.missing.slice(0, 6).join(" | ")}`)
      if (note?.placeholders?.length)
        console.log(`  placeholders: ${note.placeholders.join(" | ")}`)
      if (note?.imgsNoAlt) console.log(`  img no alt  : ${note.imgsNoAlt}`)
      if (note?.linksNoText) console.log(`  link no text: ${note.linksNoText}`)
      if (note?.buttonsNoName) console.log(`  btn no name : ${note.buttonsNoName}`)
      if (note?.emptyLinks) console.log(`  a no href   : ${note.emptyLinks}`)
      if (note?.h1s && note.h1s.length !== 1)
        console.log(`  h1 count    : ${note.h1s.length} ${JSON.stringify(note.h1s)}`)
      if (note?.error) console.log(`  error       : ${note.error}`)
    }
  }
}

await browser.close()

const summary = {
  routes: report.length,
  withConsoleErrors: report.filter((r) => r.consoleErrors.length).length,
  withPageErrors: report.filter((r) => r.pageErrors.length).length,
  withFailedRequests: report.filter((r) => r.failedRequests.length).length,
  withBadResponses: report.filter((r) => r.badResponses.length).length,
  withMissingMessages: report.filter((r) => r.missing?.length).length,
  withPlaceholders: report.filter((r) => r.placeholders?.length).length,
  nonOk: report.filter((r) => r.status >= 400).map((r) => `${r.path} ${r.status}`),
}

if (asJson) {
  console.log(JSON.stringify({ summary, report }, null, 2))
} else {
  console.log("\n=== summary ===")
  console.log(JSON.stringify(summary, null, 2))
}

const failures =
  summary.withConsoleErrors +
  summary.withPageErrors +
  summary.withFailedRequests +
  summary.withBadResponses +
  summary.withMissingMessages +
  summary.withPlaceholders +
  summary.nonOk.length

process.exit(failures > 0 ? 1 : 0)
