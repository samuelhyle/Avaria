"use client"
import { type LaboratoryInputs, calculateLaboratory } from "@/lib/calculations"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import type { ToolTrace } from "./MessageList"
export function ResearchResultCards({ trace }: { trace?: ToolTrace[] }) {
  const locale = useLocale()
  const t = useTranslations("calculator")
  const a = useTranslations("averia.assistant")
  const r = useTranslations("research")
  const number = (n: number) =>
    new Intl.NumberFormat(locale, { maximumSignificantDigits: 8 }).format(n)
  return (
    <>
      {trace?.map((tool) => {
        if (!tool.result || typeof tool.result !== "object") return null
        const result = tool.result as Record<string, unknown>
        if (result.error) return null
        if (
          (tool.name === "calculateLaboratory" || tool.name === "getReconstitution") &&
          result.calculation &&
          typeof result.calculation === "object"
        ) {
          const raw = (result.calculation as { inputs?: LaboratoryInputs }).inputs
          const calc = raw ? calculateLaboratory(raw) : null
          if (!calc) return null
          const params = new URLSearchParams(
            Object.entries(calc.inputs).map(([k, v]) => [k, String(v)]),
          )
          const values = calc.values
          return (
            <section
              key={tool.id}
              className="rounded-xl border border-accent/30 bg-accent-soft/30 p-4"
            >
              <h3 className="mb-3 text-sm font-semibold">{t("exportTitle")}</h3>
              <p className="font-mono text-sm">{calc.formula}</p>
              <div className="mt-3 space-y-2 text-sm">
                {Object.entries(calc.inputs)
                  .filter(([k]) => k !== "mode")
                  .map(([k, v]) => (
                    <dl key={k} className="flex flex-wrap justify-between gap-2">
                      <dt className="text-ink-muted">{a(`inputs.${k}` as never)}</dt>
                      <dd className="font-mono">{number(v as number)}</dd>
                    </dl>
                  ))}
                {Object.entries(values)
                  .filter(([key]) => !key.endsWith("Ul") && key !== "concentrationMcgPerMl")
                  .map(([key, value]) => {
                    const labels: Record<string, [string, string]> = {
                      concentrationMgPerMl: ["concentration", "mg/mL"],
                      finalVolumeMl: ["finalVolume", "mL"],
                      stockVolumeMl: ["stockVolume", "mL"],
                      makeUpVolumeMl: ["makeUp", "mL"],
                      aliquotVolumeMl: ["aliquotVolume", "mL"],
                      aliquotCount: ["count", ""],
                      remainingMassMcg: ["remainingMass", "µg"],
                      remainingVolumeMl: ["remainingVolume", "mL"],
                    }
                    const [label, unit] = labels[key] ?? ["concentration", ""]
                    return (
                      <dl
                        key={key}
                        className="flex flex-wrap justify-between gap-2 border-t border-line pt-2"
                      >
                        <dt className="text-ink-muted">{t(label)}</dt>
                        <dd className="font-mono text-sm">
                          {number(value)} {unit}
                        </dd>
                      </dl>
                    )
                  })}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t("assumptions")}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t("rounding")}</p>
              <Link
                className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-accent underline"
                href={`/${locale}/peptide-calculator?${params}`}
              >
                {r("useCalculator")} →
              </Link>
            </section>
          )
        }
        if (tool.name === "compareProducts" && Array.isArray(result.products)) {
          const rows = result.products as Array<{
            name: string
            requestedSku: string | null
            vialSizes: string[]
            variants: Array<{
              sku: string
              purchaseMode: string
              stockQty: number
              documentsAvailable: boolean
            }>
          }>
          return (
            <section key={tool.id} className="rounded-xl border border-line bg-surface p-4">
              <h3 className="mb-3 text-sm font-semibold">{r("compare")}</h3>
              <div
                className="max-w-full overflow-x-auto"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: horizontal comparisons must be keyboard scrollable.
                tabIndex={0}
                role="region"
                aria-label={r("compareHelp")}
              >
                <table className="w-full min-w-[340px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className="p-2">
                        {r("product")}
                      </th>
                      <th scope="col" className="p-2">
                        SKU
                      </th>
                      <th scope="col" className="p-2">
                        {r("availability")}
                      </th>
                      <th scope="col" className="p-2">
                        {r("documents")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.requestedSku ?? row.name} className="border-b border-line">
                        <th scope="row" className="p-2 font-medium">
                          {row.name}
                          <span className="mt-1 block font-normal text-ink-muted">
                            {row.vialSizes.join(" / ")}
                          </span>
                        </th>
                        <td className="p-2 font-mono">
                          {row.variants.map((v) => v.sku).join(" / ")}
                        </td>
                        <td className="p-2">
                          {row.variants.some((v) => v.purchaseMode === "direct" && v.stockQty > 0)
                            ? r("available")
                            : row.variants.some((v) => v.purchaseMode === "quotation")
                              ? r("quote")
                              : r("unavailable")}
                        </td>
                        <td className="p-2">
                          {row.variants.some((v) => v.documentsAvailable)
                            ? r("documentAvailable")
                            : r("noDocuments")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        }
        if (tool.name === "getDocuments" && Array.isArray(result.documents)) {
          const docs = result.documents as Array<{
            id: string
            title: string
            version: string
            publishedAt: string
            batchCode: string | null
            sku: string | null
            url: string
          }>
          return (
            <section key={tool.id} className="rounded-xl border border-line bg-surface p-4">
              <h3 className="text-sm font-semibold">{r("documents")}</h3>
              {!docs.length ? (
                <p className="mt-2 text-sm text-ink-muted">{r("noDocuments")}</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {docs.map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.url}
                        className="text-sm text-accent underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {doc.title}
                      </a>
                      <p className="mt-1 text-xs text-ink-muted">
                        {doc.sku} {doc.batchCode} · {a("version")}: {doc.version} ·{" "}
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                          new Date(doc.publishedAt),
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{a("sourceNotice")}</p>
            </section>
          )
        }
        if (
          tool.name === "prepareCommunityDraft" &&
          result.draft &&
          typeof result.draft === "object"
        ) {
          const draft = result.draft as { title: string; body: string }
          if (typeof draft.title !== "string" || typeof draft.body !== "string") return null
          const query = new URLSearchParams({ title: draft.title, calculation: draft.body })
          return (
            <section key={tool.id} className="rounded-xl border border-line p-4">
              <h3 className="text-sm font-semibold">{draft.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{a("draftNotice")}</p>
              <Link
                href={`/${locale}/community/new?${query}`}
                className="mt-3 inline-block text-sm text-accent underline"
              >
                {a("reviewDraft")} →
              </Link>
            </section>
          )
        }
        return null
      })}
    </>
  )
}
