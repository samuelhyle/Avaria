import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AverianLabs — Research peptides",
    short_name: "AverianLabs",
    description:
      "EU-dispatched, third-party HPLC-verified research peptides with batch-specific COA.",
    start_url: "/en",
    display: "standalone",
    background_color: "#fbfcfe",
    theme_color: "#2563eb",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  }
}
