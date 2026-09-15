import { renderOg } from "@/lib/og/render"

export const runtime = "nodejs"

export async function GET() {
  return renderOg({
    kind: "Research store",
    title: "Precision peptides for serious research",
    subtitle:
      "EU-dispatched, third-party HPLC-verified research peptides. Batch-specific COA on every vial.",
    meta: "averianlabs.eu · Research use only",
  })
}
