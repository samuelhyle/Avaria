import { ogLocale, renderOg } from "@/lib/og/render"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const locale = ogLocale(request)
  return renderOg({
    locale,
    kind: locale === "fi" ? "Tutkimusmateriaalit" : "Research materials",
    title: locale === "fi" ? "Materiaaleja laboratoriotyöhön" : "Materials for laboratory research",
    subtitle:
      locale === "fi"
        ? "Tutustu tuotteisiin, tarkista erän asiakirjat ja kysy saatavuudesta ennen tilaamista."
        : "Browse products, check batch documentation and confirm availability before ordering.",
    meta: "averianlabs.eu",
  })
}
