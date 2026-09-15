/**
 * escalateToHuman — return a handoff link + ETA.
 *
 * Used when Averia cannot answer or the user asks for a human.
 */

import type { Tool, ToolContext, ToolResult } from "@/lib/ai/tools/registry"

interface Args {
  reason?: string
}

export const escalateTool: Tool = {
  definition: {
    name: "escalateToHuman",
    description:
      "Return a support handoff link + ETA when the user asks for a human or the question is outside the catalog. Always offer this before refusing an in-scope question.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Short reason — captured in the handoff form so a human has context.",
        },
      },
      required: [],
    },
  },
  async execute(rawArgs, ctx): Promise<ToolResult> {
    const args = (rawArgs ?? {}) as Args
    const notices: Record<string, string> = {
      en: "A specialist will follow up within 24 hours. The last 20 turns of this conversation are attached to the ticket.",
      fi: "Asiantuntija vastaa 24 tunnin sisällä. Keskustelun 20 viimeisintä vuoroa liitetään tukipyyntöön.",
      de: "Ein Spezialist meldet sich innerhalb von 24 Stunden. Die letzten 20 Nachrichten dieses Gesprächs werden dem Ticket beigefügt.",
      sv: "En specialist återkommer inom 24 timmar. De senaste 20 meddelandena i konversationen bifogas ärendet.",
      nl: "Een specialist reageert binnen 24 uur. De laatste 20 berichten van dit gesprek worden aan het ticket toegevoegd.",
    }
    const notice = notices[ctx.locale as keyof typeof notices] ?? notices.en
    return {
      content: {
        ok: true,
        handoffUrl: `/${ctx.locale}/contact?topic=averia-handoff&reason=${encodeURIComponent(args.reason ?? "")}`,
        etaHours: 24,
        notice,
      },
    }
  },
}
