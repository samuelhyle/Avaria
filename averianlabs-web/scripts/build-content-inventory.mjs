import { execFileSync } from "node:child_process"
import fs from "node:fs"
import ts from "typescript"

const date = "2026-10-15"
const output = `docs/CONTENT_INVENTORY_${date}`
const previousInventory = fs.existsSync(`${output}.json`)
  ? JSON.parse(fs.readFileSync(`${output}.json`, "utf8"))
  : {}
const baselineCommit =
  process.env.CONTENT_BASELINE_COMMIT ??
  previousInventory.baselineCommit ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
const dictionaries = Object.fromEntries(
  ["en", "fi"].map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(`messages/${locale}.json`, "utf8")),
  ]),
)
const flatten = (value, prefix = "", result = {}) => {
  for (const [key, child] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === "object") flatten(child, name, result)
    else result[name] = child
  }
  return result
}
const head = {}
for (const locale of ["en", "fi"]) {
  const tracked = execFileSync("git", ["ls-files", "--full-name", `messages/${locale}.json`], {
    encoding: "utf8",
  }).trim()
  head[locale] = flatten(
    JSON.parse(execFileSync("git", ["show", `${baselineCommit}:${tracked}`], { encoding: "utf8" })),
  )
}
const routeGroups = {
  meta: "All routes: metadata and sharing",
  research: "Shared research/product/commerce/account UI",
  nav: "Global navigation",
  home: "Home",
  experience: "Home/navigation/search",
  shop: "Catalogue",
  product: "Product/SKU",
  cart: "Cart",
  checkout: "Checkout",
  footer: "Footer",
  cookies: "Consent",
  ageGate: "Eligibility",
  averia: "Assistant/chat",
  community: "Community",
  documents: "Document detail",
  documentLibrary: "Public document library/recovery",
  calculator: "Calculator/results/exports/history",
  glossary: "Glossary",
  contact: "Contact",
  newsletter: "Newsletter",
  account: "Account",
  auth: "Authentication",
  plans: "Research plans",
  privacy: "Privacy/account data",
  notifications: "Notifications",
  admin: "Administration",
  common: "Shared controls",
  errors: "Errors/recovery",
  notFound: "404/recovery",
}
const stateFamily = (key) =>
  /error|failed|invalid|unavailable|offline|limited|blocked|range/i.test(key)
    ? "error/validation/recovery"
    : /empty|noMatch|noResults|noDocuments|noSaved/i.test(key)
      ? "empty/no-match"
      : /pending|review|nominal|origin|scope|assumptions/i.test(key)
        ? "scope/provenance/review"
        : /saving|loading|sending|submitting|processing|preparing/i.test(key)
          ? "loading/progress"
          : /saved|received|confirmed|success|deleted|removed|copied/i.test(key)
            ? "completion/confirmation"
            : /consent|privacy|delete|deletion|private/i.test(key)
              ? "privacy/consent/destructive-action"
              : "default/context-dependent"
const en = flatten(dictionaries.en)
const fi = flatten(dictionaries.fi)
const rows = Object.keys(en)
  .sort()
  .map((key) => {
    const changed = en[key] !== head.en[key] || fi[key] !== head.fi[key]
    return {
      key,
      source: "messages/{en,fi}.json",
      routeGroup: routeGroups[key.split(".")[0]] ?? key.split(".")[0],
      stateFamily: stateFamily(key),
      en: en[key],
      fi: fi[key],
      changedSinceHead: changed,
      reviewStatus: changed ? "code-assisted-editorial-review" : "inventoried-existing-wording",
      independentApproval: "pending-where-applicable",
      ...(changed ? { previousEn: head.en[key] ?? null, previousFi: head.fi[key] ?? null } : {}),
    }
  })
// Inventory the separately authored transactional copy without evaluating application code.
const emailSource = ts.createSourceFile(
  "lib/email/index.ts",
  fs.readFileSync("lib/email/index.ts", "utf8"),
  ts.ScriptTarget.Latest,
  true,
)
function literal(node) {
  if (ts.isAsExpression(node)) return literal(node.expression)
  if (ts.isStringLiteral(node)) return node.text
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal)
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties
        .filter(ts.isPropertyAssignment)
        .map((p) => [p.name.getText(emailSource).replaceAll('"', ""), literal(p.initializer)]),
    )
  return null
}
let emailCopy = {}
function visit(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(emailSource) === "emailCopy" &&
    node.initializer
  )
    emailCopy = literal(node.initializer)
  ts.forEachChild(node, visit)
}
visit(emailSource)
const emailsEn = flatten(emailCopy.en ?? {})
const emailsFi = flatten(emailCopy.fi ?? {})
const emailRows = Object.keys(emailsEn).map((key) => ({
  key: `email.${key}`,
  source: "lib/email/index.ts",
  routeGroup: "Transactional email",
  stateFamily: "subject/body/action/footer",
  en: emailsEn[key],
  fi: emailsFi[key],
}))
const surfaces = [
  {
    source: "lib/email/receipt.ts",
    states: "Paid receipt; item/SKU/batch; totals/tax/shipping; original documents",
    factualBasis:
      "Order snapshot and confirmed payment; no delivery claim inferred from queued mail.",
  },
  {
    source: "app/global-error.tsx",
    states: "Global runtime failure; locale-derived EN/FI title, help and Retry",
    factualBasis: "Observed runtime failure; inline copy remains independent of dictionary parity.",
  },
  {
    source: "app/[locale]/error.tsx; app/[locale]/not-found.tsx",
    states: "Route failure/404; home/retry",
    factualBasis: "Route outcome; no private document existence disclosed.",
  },
  {
    source: "lib/products/catalogue.ts; product translations in database",
    states: "Name/description/category/quantity/SKU/price/stock/purchase eligibility",
    factualBasis:
      "Current product/variant source records; approved exact specifications still owner-supplied.",
  },
  {
    source: "lib/documents/service.ts; documents database records",
    states: "Public/date/locale/access; product-wide versus exact batch/SKU; original file/version",
    factualBasis:
      "Declared association and original source; publication is not suitability approval.",
  },
  {
    source: "lib/ai/answers/{calculation,catalogue,guidance}.ts",
    states: "Controlled result/source narratives; missing-input and no-evidence answers",
    factualBasis:
      "Deterministic calculator, returned records, versioned guidance; independent scientific approval pending.",
  },
  {
    source: "components/calculator/Calculator.tsx; lib/calculations.ts",
    states:
      "Each mode; blank/invalid/example/catalogue/user/transferred/saved inputs; units/formula/rounding; CSV/copy/print/history",
    factualBasis:
      "User quantities and deterministic results; nominal quantity is not an analytical content measurement.",
  },
  {
    source: "components/ai/{AssistantCanvas,MessageList,ChatInput}.tsx",
    states:
      "Welcome/tool/source/result cards; consent; in-flight/cancel/interrupted/retry/rate limit; reading position",
    factualBasis:
      "Implemented tool/workflow state; saving is separate from processing a submitted message.",
  },
  {
    source: "components/community/{ThreadComposer,ReplyBox,PostCard,ReportDialog}.tsx",
    states:
      "Private draft/unsaved/replace/remove; submit/pending/rejected/published; sources/reactions/reporting",
    factualBasis:
      "Owner visibility and human publication decision; reactions do not establish scientific credentials.",
  },
  {
    source:
      "components/media/*; components/product/{ProductGallery,VialGraphic}.tsx; lib/glossary/sanity.ts",
    states:
      "Illustration/diagram/photo; selected locale/SKU; alt/caption/source/review; loading/fallback/reduced motion",
    factualBasis:
      "Asset registry and approved originals; scientific figures require text equivalents.",
  },
  {
    source: "lib/seo/*; app/api/og/*; components/seo/JsonLd.tsx",
    states: "FI/EN titles/descriptions/canonical/social/fallback/structured data",
    factualBasis: "Environment-specific origin, actual locale and current allowed source fields.",
  },
  {
    source: "app/[locale]/legal/*; lib/legal.ts",
    states: "Seller identity/policies/retention/privacy/consent; missing owner configuration",
    factualBasis:
      "Approved owner policies and actual operations; pending seller inputs remain explicit.",
  },
  {
    source: "components/checkout/*; app/[locale]/checkout/*",
    states:
      "Empty cart; quantity/price/tax/delivery; payment pending/paid/failed/review; validation/recovery",
    factualBasis:
      "Current eligible SKU and merchant-provider state; real-provider rehearsals remain gated.",
  },
  {
    source: "app/[locale]/account/*; app/[locale]/login/*; lib/gdpr/*",
    states: "Authentication/recovery/export/deletion; permissions; expiry; saving acknowledgement",
    factualBasis:
      "Account workflow and approved retention policy; no unconfirmed email-delivery promise.",
  },
]
const summary = {
  dictionaryRows: rows.length,
  changedDictionaryRows: rows.filter((row) => row.changedSinceHead).length,
  transactionalEmailRows: emailRows.length,
  missingFinnishKeys: Object.keys(en).filter((key) => fi[key] === undefined),
  observedLocales: ["en", "fi"],
  additionalLocales:
    "DE/SV/NL key parity retained. Document-library additions are translated; neutral metadata and new shared workspace/brand/home additions currently use English fallback and require native review.",
}
const inventory = {
  date,
  baselineCommit,
  scope:
    "Working-tree interface content inventory; not native-language/scientific/legal/merchant approval.",
  summary,
  provenance: {
    dictionary:
      "Labels describe implemented UI. Factual product, batch, price and commercial statements must retain their actual source and release rules.",
    review:
      "Changed EN/FI wording received code-assisted editorial review. Independent native-language and scientific review, approved seller policies and original material records remain pending.",
    stateFamily:
      "Key-based grouping for navigation; functional state matrix and browser evidence are required to prove coverage.",
  },
  dictionary: rows,
  transactionalEmail: emailRows,
  nonDictionarySurfaces: surfaces,
}
fs.writeFileSync(`${output}.json`, `${JSON.stringify(inventory, null, 2)}\n`)
const lines = [
  `# FI/EN content inventory — ${date}`,
  "",
  "This records the current working-tree text and its source. It is an implementation inventory, not independent language, scientific, legal or merchant approval.",
  "",
  `- Dictionary rows: **${summary.dictionaryRows}**, of which **${summary.changedDictionaryRows}** differ from the committed baseline.`,
  `- Separately authored transactional email rows: **${summary.transactionalEmailRows}**.`,
  `- Missing Finnish keys: **${summary.missingFinnishKeys.length}**.`,
  "- [Full key-by-key EN/FI ledger, previous changed text and source/state families](CONTENT_INVENTORY_2026-10-15.json).",
  "- Regenerate with `node scripts/build-content-inventory.mjs` after copy changes.",
  "",
  "## Termbase",
  "",
  "| Concept | English | Finnish |",
  "| --- | --- | --- |",
  "| Main library | Documents | Asiakirjat |",
  "| Batch subset | Batch documents | Eräasiakirjat |",
  "| COA | Certificate of Analysis (COA) | Analyysitodistus |",
  "| Educational page | Understanding test results | Analyysitulosten tulkinta |",
  "| Variant identifier | Product code (SKU) | Tuotekoodi (SKU) |",
  "| Quantity shown by catalogue | Nominal quantity | Nimellismäärä |",
  "| g/mol | Molar mass | Moolimassa |",
  "| Small divided sample | Aliquot | Osanäyte |",
  "| Unsaved/private/submitted/public | Distinct actual states | Tallentamaton / yksityinen / lähetetty tarkistettavaksi / julkaistu |",
  "",
  "## Non-dictionary and generated surfaces",
  "",
  "| Source | States / coverage | Factual basis |",
  "| --- | --- | --- |",
  ...surfaces.map((row) => `| ${row.source} | ${row.states} | ${row.factualBasis} |`),
  "",
  "## Trust and approval limits",
  "",
  "Product-wide documents remain applicable to their product; batch documents retain their exact batch/SKU. Public publication, batch release and suitability for a particular experiment remain separate facts. Empty searches, an empty public collection, an unreachable service, restricted access and an unavailable file must never use the same factual explanation.",
  "",
  "Preserve original chemical identifiers, units, source dates and report versions. Use Finnish sentence case and British English consistently. A successful persistence acknowledgement is not a promise that an email has arrived. A private draft is not a published discussion. Community reactions are not scientific qualifications.",
  "",
  summary.additionalLocales,
  "",
  "Independent native Finnish/English and scientific review of changed scientific material remains pending. Seller details, approved policies, exact specifications and original batch reports will be supplied later. They were not invented or requested again. Existing test counts are historical until the final implementation checks run.",
  "",
]
fs.writeFileSync(`${output}.md`, lines.join("\n"))
console.log(JSON.stringify(summary))
