import type { MetadataRoute } from "next"

export function storefrontManifest(locale = "en"): MetadataRoute.Manifest {
  const fi = locale === "fi"
  return {
    name: fi ? "AverianLabs — Tutkimusmateriaalit" : "AverianLabs — Research materials",
    short_name: "AverianLabs",
    description: fi
      ? "Materiaaleja laboratoriotutkimukseen. Tarkista tuotetiedot, erän asiakirjat ja saatavuus ennen tilaamista."
      : "Materials for laboratory research. Check product records, batch documentation and availability before ordering.",
    lang: fi ? "fi" : "en",
    start_url: `/${locale}`,
    display: "standalone",
    background_color: "#fbfcfe",
    theme_color: "#105BE1",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  }
}
