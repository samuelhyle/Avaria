import { GET as legacyGet } from "../route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; locale: string }> },
) {
  const params = await context.params
  if (params.locale !== "en" && params.locale !== "fi")
    return new Response("Not found", { status: 404 })
  const url = new URL(request.url)
  url.searchParams.set("locale", params.locale)
  const localized = new Request(url, request)
  return legacyGet(localized, { params: Promise.resolve({ id: params.id }) })
}
