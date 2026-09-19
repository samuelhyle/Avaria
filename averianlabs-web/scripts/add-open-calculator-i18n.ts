/**
 * One-off migration: add the `product.openCalculator` key to every non-English
 * locale so the product page link to the calculator doesn't render English
 * fallback text.
 */

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const translations: Record<string, string> = {
  fi: "Laske liuotus tälle pullolle",
  de: "Rekonstitution für diese Flasche berechnen",
  sv: "Beräkna rekonstitution för denna flaska",
  nl: "Bereken reconstitutie voor deze flacon",
}

for (const locale of Object.keys(translations)) {
  const file = path.join(ROOT, `messages/${locale}.json`)
  const data = JSON.parse(fs.readFileSync(file, "utf8"))
  data.product = data.product || {}
  if (!data.product.openCalculator) {
    data.product.openCalculator = translations[locale]
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
    console.log(`✓ ${locale}: product.openCalculator added`)
  }
}
