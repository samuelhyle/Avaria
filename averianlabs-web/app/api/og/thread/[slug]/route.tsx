import { getThreadBySlug } from "@/lib/community"
import { ogLocale, renderOg } from "@/lib/og/render"

export const runtime = "nodejs"

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const locale = ogLocale(req)
  const thread = await getThreadBySlug(slug).catch(() => null)
  if (!thread) {
    return new Response("Not found", { status: 404 })
  }
  return renderOg({
    locale,
    kind: locale === "fi" ? "Keskustelu" : "Thread",
    title: thread.title,
    subtitle:
      locale === "fi"
        ? `${thread.replyCount} vastausta · ${thread.viewCount} katselua`
        : `${thread.replyCount} replies · ${thread.viewCount} views`,
    badge: locale === "fi" ? "Tutkimusyhteisö" : "Community",
    meta: thread.authorName
      ? `${locale === "fi" ? "Kirjoittaja:" : "by"} ${thread.authorName}`
      : undefined,
  })
}
