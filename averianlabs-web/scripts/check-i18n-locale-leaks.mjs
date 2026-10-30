#!/usr/bin/env node
/**
 * Guard against Finnish copy leaking into the other locales.
 *
 * A string was copied from `fi.json` into every locale at once, so the English
 * catalogue shipped "Pikasuodattimet" and "Asiakirjat" for months. The key
 * parity check cannot see this: every locale had the key, and every locale
 * had the same (Finnish) value.
 *
 * This script looks for unmistakably Finnish words in the locales that are
 * not Finnish. It is a heuristic, so it reports suspects for a human to
 * confirm rather than guessing.
 *
 * Only whole words count, and only a small curated list is used: a false
 * positive costs a human a minute, a false negative ships the wrong language.
 * Proper nouns are excluded — "tietosuoja.fi" is the address of the Finnish
 * Data Protection Ombudsman and appears in every locale on purpose.
 * Character-level checks are not used — Swedish and German legitimately
 * contain "ä" and "ö".
 *
 * Usage:
 *   node scripts/check-i18n-locale-leaks.mjs
 *
 * Exit codes:
 *   0 — no suspect strings
 *   1 — at least one suspect
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const LOCALES = ["en", "fi", "sv", "ru"]
/** The locale whose copy is allowed to contain Finnish words. */
const FINE = "fi"

/** Words that are unmistakably Finnish in a customer-facing string. */
const FINNISH_WORDS = [
  "asiakirjat",
  "asiakirja",
  "pikasuodattimet",
  "napsautuksella",
  "ostoskori",
  "ostoskorin",
  "toimituksen",
  "toimitukset",
  "hinnat",
  "käytössä",
  "lisää",
  "valitse",
  "sisältyvät",
  "suoraan",
  "yhdellä",
  "sekä",
  "myös",
  "jälkeen",
  "ennen",
  "kuitenkin",
  "esimerkiksi",
  "tarkemmin",
  "tilauksesi",
  "maksaminen",
  "pyynnöllä",
  "varastossa",
  "yhteensä",
  "välisumma",
  "suosikit",
  "asiakkaalle",
  "materiaalit",
  "tutkimukset",
  "hinnasto",
  "toimitusehdot",
  "yhteystiedot",
  "käyttöehdot",
  "palautukset",
]

function load(locale) {
  return JSON.parse(readFileSync(resolve("messages", `${locale}.json`), "utf8"))
}

function walk(value, prefix = "") {
  const out = []
  for (const [key, child] of Object.entries(value ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === "object") out.push(...walk(child, path))
    else if (typeof child === "string") out.push([path, child])
  }
  return out
}

/**
 * A leaf that should hold a string but holds `{ "<its own name>": "…" }`.
 *
 * This shape comes from assigning a whole object where a string was meant —
 * `j.research.checkoutTrust = { checkoutTrust: "…" }` — and it renders as
 * the raw key at runtime.
 */
function walkAll(value, prefix = "") {
  const out = []
  for (const [key, child] of Object.entries(value ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === "object") {
      const last = path.split(".").pop()
      const keys = Object.keys(child)
      if (keys.length === 1 && keys[0] === last) out.push([path, child])
      out.push(...walkAll(child, path))
    } else out.push([path, child])
  }
  return out
}

const pattern = new RegExp(`\\b(${FINNISH_WORDS.join("|")})\\b`, "u")
const suspects = []
for (const locale of LOCALES) {
  let messages
  try {
    messages = load(locale)
  } catch {
    console.error(`[i18n:leaks] messages/${locale}.json could not be read`)
    process.exit(1)
  }
  // Finnish is the source of the suspect list, so Finnish copy is expected.
  if (locale === FINE) continue
  for (const [path, value] of walk(messages)) {
    if (value.length > 400) continue
    const hit = pattern.exec(value.toLocaleLowerCase("fi"))
    if (hit) suspects.push({ locale, path, value, reason: `Finnish word "${hit[1]}"` })
  }
  for (const [path, value] of walkAll(messages)) {
    if (value && typeof value === "object")
      suspects.push({ locale, path, value, reason: "object where a string was expected" })
  }
}

if (!suspects.length) {
  console.log(`[i18n:leaks] ${LOCALES.length} locales · no Finnish copy found outside ${FINE}.json`)
  process.exit(0)
}

console.error(`[i18n:leaks] ${suspects.length} suspect string(s) outside ${FINE}.json:`)
for (const suspect of suspects)
  console.error(
    `  ${suspect.locale}.${suspect.path} — ${suspect.reason}\n    ${JSON.stringify(suspect.value)}`,
  )
process.exit(1)
