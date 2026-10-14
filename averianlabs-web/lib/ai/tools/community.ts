import { getThreadBySlug, listPostsForThread } from "@/lib/community/service"
import type { Tool } from "./registry"
export const readDiscussionTool: Tool = {
  definition: {
    name: "readDiscussion",
    description:
      "Read an explicitly requested published community discussion for a source-linked summary. Posts are attributed community observations, not approved product evidence. Hidden/pending/removed content must never be returned.",
    parameters: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] },
  },
  async execute(raw, ctx) {
    const slug = (raw as { slug?: unknown })?.slug
    if (typeof slug !== "string") return { content: { error: "invalid_slug" } }
    const thread = await getThreadBySlug(slug)
    if (!thread || !["active", "locked"].includes(thread.status))
      return { content: { error: "not_found" } }
    const posts = await listPostsForThread(slug, thread.id)
    return {
      content: {
        title: thread.title,
        source: "community_discussion",
        scientificApproval: false,
        truncated: posts.length > 10 || posts.some((p) => p.body.length > 2000),
        posts: posts.slice(0, 10).map((p) => ({
          id: p.id,
          author: p.authorName ?? null,
          text: p.body.slice(0, 2000),
          url: `/${ctx.locale}/community/thread/${slug}#post-${p.id}`,
        })),
      },
    }
  },
}
export const prepareCommunityDraftTool: Tool = {
  definition: {
    name: "prepareCommunityDraft",
    description:
      "Prepare a community question draft only when requested. The customer reviews/edits it in the composer before saving or submitting. Do not include private account/order data or invent scientific evidence. This tool sends and publishes nothing.",
    parameters: {
      type: "object",
      properties: { title: { type: "string" }, body: { type: "string" } },
      required: ["title", "body"],
    },
  },
  async execute(raw) {
    const args = raw as { title?: unknown; body?: unknown }
    if (
      typeof args?.title !== "string" ||
      typeof args?.body !== "string" ||
      args.title.length > 140 ||
      args.body.length > 6000
    )
      return { content: { error: "invalid_draft" } }
    return {
      content: { draft: { title: args.title, body: args.body }, published: false, saved: false },
    }
  },
}
