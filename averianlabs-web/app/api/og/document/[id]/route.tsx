import { getDocumentById } from "@/lib/documents/service"
import { ogLocale, renderOg } from "@/lib/og/render"
import { getTranslations } from "next-intl/server"

export const runtime = "nodejs"

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const locale = ogLocale(req)
  const t = await getTranslations({ locale, namespace: "research" })
  const doc = await getDocumentById(id, locale).catch(() => null)
  if (!doc) return new Response("Not found", { status: 404 })
  return renderOg({
    locale,
    kind: locale === "fi" ? "Asiakirja" : "Document",
    title: doc.title,
    subtitle: `${t(`docLabels.${doc.type}`)} · v${doc.version}`,
    badge: doc.batchCode
      ? `${locale === "fi" ? "Erä" : "Batch"} ${doc.batchCode}`
      : locale === "fi"
        ? "Laboratorioasiakirjat"
        : "Lab docs",
    meta: doc.productName
      ? `${locale === "fi" ? "Tuote" : "Product"}: ${doc.productName}`
      : locale === "fi"
        ? "AverianLabsin asiakirjat"
        : "AverianLabs documentation",
  })
}
