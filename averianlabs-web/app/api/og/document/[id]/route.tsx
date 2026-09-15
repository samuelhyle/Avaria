import { DOCUMENT_TYPE_LABELS } from "@/lib/documents"
import { getDocumentById } from "@/lib/documents/service"
import { renderOg } from "@/lib/og/render"

export const runtime = "nodejs"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const doc = await getDocumentById(id).catch(() => null)
  if (!doc) return new Response("Not found", { status: 404 })
  return renderOg({
    kind: "Document",
    title: doc.title,
    subtitle: `${DOCUMENT_TYPE_LABELS[doc.type]} · v${doc.version}`,
    badge: doc.batchCode ? `Batch ${doc.batchCode}` : "Lab docs",
    meta: doc.productName ? `Product: ${doc.productName}` : "AverianLabs documentation",
  })
}
