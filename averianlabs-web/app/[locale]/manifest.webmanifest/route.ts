import { locales } from "@/lib/i18n/config"
import { storefrontManifest } from "@/lib/seo/manifest"

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!(locales as readonly string[]).includes(locale))
    return new Response("Not found", { status: 404 })
  return Response.json(storefrontManifest(locale), {
    headers: { "content-type": "application/manifest+json" },
  })
}
