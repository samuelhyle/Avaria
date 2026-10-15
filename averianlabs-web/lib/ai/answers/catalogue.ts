import { formatCurrency, formatNumber, formatSize } from "@/lib/utils/format"
import en from "@/messages/en.json"
import fi from "@/messages/fi.json"

type Trace = { name: string; result?: unknown }
type RecordValue = Record<string, unknown>
const record = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : {}
const rows = (value: unknown): RecordValue[] => (Array.isArray(value) ? value.map(record) : [])
const safe = (value: unknown) =>
  String(value ?? "")
    .replace(/[\n\r|<>`\[\]]/g, " ")
    .slice(0, 160)

/** Commercial and document prose comes from tool records, with no model-added promises. */
export function renderCatalogueAnswer(trace: Trace[], locale: string): string | null {
  const catalogueTools = new Set([
    "getProduct",
    "searchProducts",
    "compareProducts",
    "getDocuments",
    "getBatches",
  ])
  if (trace.some((item) => !catalogueTools.has(item.name))) return null
  const copy = locale === "fi" ? fi : en
  const r = copy.research
  const missing = "—"
  const status = (value: RecordValue) =>
    value.purchaseMode === "direct" &&
    typeof value.stockQty === "number" &&
    value.stockQty > 0 &&
    (value.priceCents === undefined ||
      (typeof value.priceCents === "number" && value.priceCents > 0))
      ? r.available
      : value.purchaseMode === "quotation"
        ? r.quote
        : r.unavailable
  const productLink = (slug: unknown) =>
    typeof slug === "string" && /^[a-z0-9-]+$/.test(slug)
      ? `[${r.fullDetails}](/${locale}/shop/${slug})`
      : ""
  const sourceNotice = `${copy.averia.assistant.sourceNotice} ${r.researchOnly}`
  const comparison = trace.findLast((item) => item.name === "compareProducts")
  if (comparison) {
    const result = record(comparison.result)
    const products = rows(result.products)
    if (!result.error && products.length) {
      const lines = [
        `| ${r.product} | SKU | ${r.vialSizes} | ${r.availability} | ${r.batch} | ${r.documents} |`,
        "|---|---|---|---|---|---|",
      ]
      for (const product of products)
        for (const variant of rows(product.variants)) {
          lines.push(
            `| ${safe(product.name)} | ${safe(variant.sku)} | ${safe(variant.size)} | ${status(variant)} | ${safe(variant.batchCode) || missing} | ${variant.documentsAvailable ? r.documentAvailable : r.noDocumentsShort} |`,
          )
        }
      return [
        ...lines,
        "",
        copy.calculator.nominalNote,
        "",
        ...products.map((p) => productLink(p.slug)),
        "",
        sourceNotice,
      ].join("\n")
    }
  }
  const documents = trace.findLast((item) => item.name === "getDocuments")
  if (documents) {
    const result = record(documents.result)
    if (!result.error && Array.isArray(result.documents)) {
      const available = rows(result.documents)
      if (!available.length)
        return [r.noDocuments, productLink(result.slug), sourceNotice].filter(Boolean).join("\n\n")
      // Original links and version/batch context are shown in the structured source card.
      return [r.documentsTitle, productLink(result.slug), sourceNotice].filter(Boolean).join("\n\n")
    }
  }
  const batches = trace.findLast((item) => item.name === "getBatches")
  if (batches) {
    const result = record(batches.result)
    if (!result.error && Array.isArray(result.batches) && !result.batches.length)
      return [r.batchPending, productLink(result.slug), sourceNotice].filter(Boolean).join("\n\n")
    if (!result.error && rows(result.batches).length) {
      const lines = [`| SKU | ${r.batch} | ${r.lab} | ${r.purity} |`, "|---|---|---|---|"]
      for (const batch of rows(result.batches))
        lines.push(
          `| ${safe(batch.sku)} | ${safe(batch.code)} | ${safe(batch.lab)} | ${typeof batch.hplcPurity === "number" ? `${formatNumber(batch.hplcPurity, locale)} %` : missing} |`,
        )
      return [...lines, "", productLink(result.slug), "", sourceNotice].join("\n")
    }
  }
  const search = trace.findLast((item) => item.name === "searchProducts")
  const products = trace.filter((item) => item.name === "getProduct" && !record(item.result).error)
  if (!products.length && search && !record(search.result).error)
    products.push(
      ...rows(record(search.result).results).map((result) => ({ name: "getProduct", result })),
    )
  if (products.length) {
    const lines = []
    for (const item of products) {
      const product = record(item.result)
      const variants = rows(product.vials)
      if (!variants.length) continue
      lines.push(
        `**${safe(product.name)}**`,
        "",
        `| SKU | ${r.vialSizes} | ${r.availability} | ${copy.shop.price} |`,
        "|---|---|---|---|",
      )
      for (const variant of variants) {
        const size =
          typeof variant.sizeValue === "number" && typeof variant.sizeUnit === "string"
            ? formatSize(
                {
                  sizeValue: variant.sizeValue,
                  sizeUnit: variant.sizeUnit,
                },
                locale,
              )
            : missing
        const price =
          status(variant) === r.available && typeof variant.priceCents === "number"
            ? formatCurrency(variant.priceCents, "EUR", locale)
            : missing
        lines.push(`| ${safe(variant.sku)} | ${size} | ${status(variant)} | ${price} |`)
      }
      if (typeof product.casNumber === "string") lines.push("", `CAS: ${safe(product.casNumber)}`)
      if (typeof product.molecularFormula === "string")
        lines.push(`${r.formula}: ${safe(product.molecularFormula)}`)
      if (typeof product.molecularWeight === "number")
        lines.push(`${r.molecularWeight}: ${formatNumber(product.molecularWeight, locale)}`)
      if (typeof product.sequence === "string")
        lines.push(`${r.sequence}: ${safe(product.sequence)}`)
      if (typeof product.storageTemp === "string" && product.storageTemp)
        lines.push(`${r.storage}: ${safe(product.storageTemp)}`)
      lines.push("", copy.calculator.nominalNote, "", productLink(product.slug), "")
    }
    if (lines.length) return [...lines, sourceNotice].join("\n")
  }
  if (search && rows(record(search.result).results).length === 0 && !record(search.result).error)
    return copy.research.searchEmpty
  if (
    trace.some(
      (item) =>
        ["getProduct", "getDocuments", "getBatches"].includes(item.name) &&
        record(item.result).error === "not_found",
    )
  )
    return copy.research.searchEmpty
  return null
}
