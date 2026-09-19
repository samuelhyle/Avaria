import { renderOg } from "@/lib/og/render"
import { getSiteUrl } from "@/lib/site"

export const runtime = "nodejs"

export async function GET() {
  const response = await renderOg({
    kind: "Research store",
    title: "Precision peptides for serious research",
    subtitle:
      "EU-dispatched, third-party HPLC-verified research peptides. Batch-specific COA on every vial.",
    meta: `${new URL(getSiteUrl()).host} · Research use only`,
  })
  response.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
  return response
}
