import { getThreadBySlug } from "@/lib/community"
import { renderOg } from "@/lib/og/render"

export const runtime = "nodejs"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const thread = await getThreadBySlug(slug).catch(() => null)
  if (!thread) {
    return new Response("Not found", { status: 404 })
  }
  return renderOg({
    kind: "Thread",
    title: thread.title,
    subtitle: `${thread.replyCount} replies · ${thread.viewCount} views`,
    badge: "Community",
    meta: thread.authorName ? `by ${thread.authorName}` : undefined,
  })
}
