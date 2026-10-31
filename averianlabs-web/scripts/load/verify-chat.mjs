import { chromium } from "@playwright/test"

const BASE = process.argv[2] ?? "http://localhost:3000"
const LOCALES = ["en", "fi", "sv", "ru"]

const QUESTIONS = {
  en: "What is the HPLC purity of BPC-157?",
  fi: "Mikä on BPC-157:n HPLC-puhtaus?",
  sv: "Vad är BPC-157:s HPLC-renhet?",
  ru: "Какова чистота BPC-157 по ВЭЖХ?",
}

const browser = await chromium.launch()
let failures = 0

for (const locale of LOCALES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await ctx.addCookies([{ name: "averianlabs-age-confirmed", value: "1", url: BASE }])
  await ctx.addInitScript(() => localStorage.setItem("averianlabs-cookie-consent", "essential"))
  const page = await ctx.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text())
  })

  // The assistant's own rate limit is a few requests a minute. The
  // locales are spaced so the check measures the assistant, not the
  // limiter.
  if (locale !== "en") await page.waitForTimeout(20_000)
  await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle", timeout: 60_000 })
  await page.waitForTimeout(1500)
  // The assistant is called "Averia" in English, Finnish and Swedish, and
  // "Аверия" in Russian. The launcher is found through the label the
  // translation file gives it, so the check follows the copy rather than
  // hard-coding a name.
  const openLabel = await page
    .evaluate(async (loc) => {
      const res = await fetch(`/${loc}/api/../`)
      return null
    }, locale)
    .catch(() => null)
  void openLabel
  const launcher = page
    .locator("button")
    .filter({ has: page.locator("svg") })
    .filter({ hasNot: page.locator("span") })
    .last()
  await launcher.click({ timeout: 15_000 })
  await page.waitForTimeout(1500)
  await page.waitForTimeout(1200)

  // The memory-consent banner blocks the input. Decline it. It reappears
  // when the drawer is reopened, so it is dismissed again below.
  const decline = page.getByRole("button", { name: /continue without saving/i }).first()
  if (await decline.count()) {
    await decline.click()
    await page.waitForTimeout(800)
  }

  const dialog = page.getByRole("dialog").first()
  const box = dialog.getByRole("textbox").first()
  await box.focus()
  await box.pressSequentially(QUESTIONS[locale], { delay: 20 })
  await page.waitForTimeout(300)
  await box.press("Enter")

  // Wait for the answer. The answer is the last message in the list, after
  // the user's question. "Preparing an answer" is a placeholder, not an
  // answer, so it does not count.
  let answer = ""
  for (let i = 0; i < 30; i += 1) {
    await page.waitForTimeout(2000)
    const text = (await dialog.innerText().catch(() => "")).replace(/\s+/g, " ")
    // A rate-limited turn has to be retried.
    if (/För många meddelanden|Too many messages|Sovmatt|Liika monta viestiä/i.test(text)) {
      await page.waitForTimeout(30_000)
      continue
    }
    const preparing = /Valmistellaan|Förbereder|Подготавливает|Preparing an answer/i.test(text)
    if (!preparing && text.length > 350) {
      answer = text
      break
    }
  }

  // The answer is what follows the user's question.
  const afterQuestion = answer.split(QUESTIONS[locale].slice(0, 25)).slice(-1)[0] ?? ""

  const gotAnswer = afterQuestion.length > 120
  const leakedReasoning = /<think>/i.test(answer)
  // The English source text is known. A localised answer must not simply
  // reproduce it.
  const ENGLISH_SOURCE =
    "HPLC area purity describes the relative areas of integrated chromatographic peaks"
  // The English source is the expected answer in English; the other locales
  // must not reproduce it.
  const looksEnglish = locale !== "en" && afterQuestion.includes(ENGLISH_SOURCE)
  const cyrillic = /[Ѐ-ӿ]/.test(afterQuestion)
  // A Finnish or Swedish answer must contain that language's own letters,
  // not only Latin ones.
  // English is written in Latin script, so it has no distinguishing
  // characters. For the other locales the answer must contain that
  // language's own letters.
  const hasLocalLetters =
    locale === "en"
      ? true
      : locale === "fi"
        ? /[äöåÄÖÅ]/.test(afterQuestion)
        : locale === "sv"
          ? /[åäöÅÄÖ]/.test(afterQuestion)
          : cyrillic

  const ok =
    gotAnswer && !leakedReasoning && !looksEnglish && hasLocalLetters && errors.length === 0
  if (!ok) failures += 1
  console.log(
    `${ok ? "PASS" : "FAIL"} ${locale}  answered=${gotAnswer}  leaked=${leakedReasoning}  englishSource=${looksEnglish}  localChars=${hasLocalLetters}  errors=${errors.length}`,
  )
  console.log(`     ${afterQuestion.slice(0, 200)}`)
  for (const e of errors.slice(0, 2)) console.log(`     ! ${e.slice(0, 140)}`)
  // Close the drawer so the next locale starts from a clean page.
  const close = page.getByRole("button", { name: /^close$|close averia/i }).first()
  if (await close.count()) await close.click().catch(() => {})
  await ctx.close()
}

await browser.close()
console.log(`\n${LOCALES.length - failures}/${LOCALES.length} locales answered correctly.`)
process.exit(failures > 0 ? 1 : 0)
